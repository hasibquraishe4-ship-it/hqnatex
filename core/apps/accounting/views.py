
# HQNATEX_ACCOUNTING_GENERAL_LEDGER_V1
from apps.accounting.ledger_serializers import (
    GeneralLedgerLineSerializer,
    JOURNAL_RELATION_NAME,
)

from decimal import Decimal

from django.db import transaction
from rest_framework import serializers, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.api import CompanyScopedModelViewSet
from apps.finance.models import Account

from .models import (
    AccountingPeriod,
    AccountingPeriodLock,
    JournalEntry,
    JournalEntryLine,
)
from .serializers import (
    AccountingPeriodSerializer,
    JournalEntryLineSerializer,
    JournalEntrySerializer,
)


class AccountingPeriodViewSet(CompanyScopedModelViewSet):
    queryset = AccountingPeriod.objects.all()
    serializer_class = AccountingPeriodSerializer

    permission_read = "accounting.periods.view"
    permission_write = "accounting.periods.manage"

    filterset_fields = [
        "status",
        "start_date",
        "end_date",
    ]

    search_fields = [
        "name",
    ]

    ordering_fields = [
        "name",
        "start_date",
        "end_date",
        "created_at",
    ]


class JournalEntryViewSet(CompanyScopedModelViewSet):
    queryset = (
        JournalEntry.objects
        .prefetch_related("lines")
        .all()
    )

    serializer_class = JournalEntrySerializer

    permission_read = "accounting.journals.view"
    permission_write = "accounting.journals.manage"
    permission_post = "accounting.journals.post"

    filterset_fields = [
        "status",
        "entry_date",
    ]

    search_fields = [
        "entry_number",
        "description",
    ]

    ordering_fields = [
        "entry_number",
        "entry_date",
        "status",
        "created_at",
    ]

    def permission_key_for_method(self, method):
        if getattr(self, "action", None) == "post":
            return self.permission_post

        return super().permission_key_for_method(method)

    def perform_destroy(self, instance):
        if instance.status == JournalEntry.Status.POSTED:
            raise serializers.ValidationError(
                "A posted journal entry cannot be deleted."
            )

        super().perform_destroy(instance)

    @action(
        detail=True,
        methods=["post"],
        url_path="post",
    )
    @transaction.atomic
    def post(self, request, pk=None):
        entry = self.get_object()

        if entry.status == JournalEntry.Status.POSTED:
            return Response(
                {
                    "detail":
                    "Journal entry is already posted."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        lines = list(entry.lines.all())

        if len(lines) < 2:
            return Response(
                {
                    "detail":
                    "A journal entry requires at least two lines."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        debit_total = sum(
            (
                line.amount
                for line in lines
                if line.direction == "debit"
            ),
            Decimal("0"),
        )

        credit_total = sum(
            (
                line.amount
                for line in lines
                if line.direction == "credit"
            ),
            Decimal("0"),
        )

        if debit_total <= 0 or credit_total <= 0:
            return Response(
                {
                    "detail":
                    "Journal debit and credit totals must be greater than zero."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if debit_total != credit_total:
            return Response(
                {
                    "detail":
                    "Journal entry is not balanced.",
                    "debit_total": debit_total,
                    "credit_total": credit_total,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        codes = {line.account_code for line in lines}

        accounts = {
            account.code: account
            for account in Account.objects.filter(
                company_id=request.company_id,
                code__in=codes,
            )
        }

        missing = sorted(codes - set(accounts))

        if missing:
            return Response(
                {
                    "detail":
                    "One or more account codes do not exist.",
                    "account_codes": missing,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        invalid_accounts = sorted(
            code
            for code, account in accounts.items()
            if account.status != "active"
            or not account.is_posting
        )

        if invalid_accounts:
            return Response(
                {
                    "detail":
                    "One or more accounts are inactive or non-posting.",
                    "account_codes": invalid_accounts,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        periods = list(
            AccountingPeriod.objects.filter(
                company_id=request.company_id,
                start_date__lte=entry.entry_date,
                end_date__gte=entry.entry_date,
            )
        )

        if not periods:
            return Response(
                {
                    "detail":
                    "No accounting period covers the journal entry date."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        open_periods = [
            period
            for period in periods
            if period.status == AccountingPeriod.Status.OPEN
        ]

        if len(open_periods) != 1:
            return Response(
                {
                    "detail":
                    "Journal entry date must belong to exactly one open accounting period."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        period = open_periods[0]

        locked = AccountingPeriodLock.objects.filter(
            tenant_id=request.tenant_id,
            company_id=request.company_id,
            period_id=period.id,
            released_at__isnull=True,
        ).exists()

        if locked:
            return Response(
                {
                    "detail":
                    "The accounting period is locked."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        entry.status = JournalEntry.Status.POSTED
        entry.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

        return Response(
            self.get_serializer(entry).data,
            status=status.HTTP_200_OK,
        )


class JournalEntryLineViewSet(CompanyScopedModelViewSet):
    queryset = (
        JournalEntryLine.objects
        .select_related("journal_entry")
        .all()
    )

    serializer_class = JournalEntryLineSerializer

    permission_read = "accounting.journals.view"
    permission_write = "accounting.journals.manage"

    filterset_fields = [
        "journal_entry",
        "account_code",
        "direction",
    ]

    search_fields = [
        "account_code",
    ]

    ordering_fields = [
        "created_at",
        "account_code",
        "amount",
    ]

    def perform_destroy(self, instance):
        if instance.journal_entry.status == JournalEntry.Status.POSTED:
            raise serializers.ValidationError(
                "Lines of a posted journal entry are immutable."
            )

        super().perform_destroy(instance)


class GeneralLedgerViewSet(CompanyScopedModelViewSet):
    queryset = JournalEntryLine.objects.all()
    serializer_class = GeneralLedgerLineSerializer

    permission_read = "accounting.ledger.view"
    permission_write = None

    http_method_names = ["get", "head", "options"]

    def get_queryset(self):
        queryset = super().get_queryset()
        posted_filter = {
            JOURNAL_RELATION_NAME + "__status": JournalEntry.Status.POSTED,
        }
        return (
            queryset
            .filter(**posted_filter)
            .select_related(JOURNAL_RELATION_NAME)
        )
