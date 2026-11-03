
# HQNATEX_CONFIGURABLE_JOURNAL_NUMBERING_V1
from django.apps import apps as django_apps
from django.db import transaction
from apps.accounting.configuration import JOURNAL_SERIES_KEY
from apps.governance.services import allocate_number
from apps.platform_tenancy_v3.rls import set_rls_context

from decimal import Decimal

from rest_framework import serializers

from apps.finance.models import Account

from .models import (
    AccountingPeriod,
    JournalEntry,
    JournalEntryLine,
)


class AccountingPeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountingPeriod
        fields = [
            "id",
            "tenant",
            "company",
            "name",
            "start_date",
            "end_date",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "tenant",
            "company",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        start_date = attrs.get(
            "start_date",
            getattr(self.instance, "start_date", None),
        )
        end_date = attrs.get(
            "end_date",
            getattr(self.instance, "end_date", None),
        )

        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError(
                {"end_date": "End date must be on or after start date."}
            )

        return attrs


class JournalEntryLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = JournalEntryLine
        fields = [
            "id",
            "tenant",
            "company",
            "journal_entry",
            "account_code",
            "amount",
            "direction",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "tenant",
            "company",
            "created_at",
            "updated_at",
        ]

    def validate_amount(self, value):
        if value <= Decimal("0"):
            raise serializers.ValidationError(
                "Amount must be greater than zero."
            )
        return value

    def validate(self, attrs):
        request = self.context.get("request")

        company_id = getattr(request, "company_id", None) if request else None

        journal_entry = attrs.get(
            "journal_entry",
            getattr(self.instance, "journal_entry", None),
        )

        account_code = attrs.get(
            "account_code",
            getattr(self.instance, "account_code", None),
        )

        if journal_entry is not None:
            if journal_entry.status == JournalEntry.Status.POSTED:
                raise serializers.ValidationError(
                    {
                        "journal_entry":
                        "Lines of a posted journal entry are immutable."
                    }
                )

            if (
                company_id
                and str(journal_entry.company_id) != str(company_id)
            ):
                raise serializers.ValidationError(
                    {
                        "journal_entry":
                        "Journal entry must belong to the active company."
                    }
                )

        if company_id and account_code:
            account = (
                Account.objects
                .filter(
                    company_id=company_id,
                    code=account_code,
                )
                .first()
            )

            if account is None:
                raise serializers.ValidationError(
                    {
                        "account_code":
                        "Account code does not exist in the active company."
                    }
                )

            if account.status != "active":
                raise serializers.ValidationError(
                    {
                        "account_code":
                        "Journal entries cannot use an inactive account."
                    }
                )

            if not account.is_posting:
                raise serializers.ValidationError(
                    {
                        "account_code":
                        "Journal entries cannot post to a summary account."
                    }
                )

        return attrs


class JournalEntrySerializer(serializers.ModelSerializer):
    lines = JournalEntryLineSerializer(
        many=True,
        read_only=True,
    )

    debit_total = serializers.SerializerMethodField()
    credit_total = serializers.SerializerMethodField()
    is_balanced = serializers.SerializerMethodField()

    class Meta:
        model = JournalEntry
        fields = [
            "id",
            "tenant",
            "company",
            "entry_number",
            "entry_date",
            "description",
            "status",
            "lines",
            "debit_total",
            "credit_total",
            "is_balanced",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "tenant",
            "company",
            "status",
            "lines",
            "debit_total",
            "credit_total",
            "is_balanced",
            "created_at",
            "updated_at",
        ]

    def _totals(self, obj):
        debit = Decimal("0")
        credit = Decimal("0")

        for line in obj.lines.all():
            if line.direction == "debit":
                debit += line.amount
            elif line.direction == "credit":
                credit += line.amount

        return debit, credit

    def get_debit_total(self, obj):
        debit, _ = self._totals(obj)
        return debit

    def get_credit_total(self, obj):
        _, credit = self._totals(obj)
        return credit

    def get_is_balanced(self, obj):
        debit, credit = self._totals(obj)
        return debit > 0 and debit == credit

    def validate(self, attrs):
        if (
            self.instance is not None
            and self.instance.status == JournalEntry.Status.POSTED
        ):
            raise serializers.ValidationError(
                "A posted journal entry is immutable."
            )

        return attrs

    # HQNATEX_CONFIGURABLE_JOURNAL_NUMBERING_SERIALIZER_V1
    def get_fields(self):
        fields = super().get_fields()
        entry_number = fields.get("entry_number")
        if entry_number is not None:
            entry_number.read_only = True
            entry_number.required = False
        return fields

    @transaction.atomic
    def create(self, validated_data):
        validated_data.pop("entry_number", None)

        tenant = validated_data.get("tenant")
        company = validated_data.get("company")
        tenant_id = validated_data.get("tenant_id")
        company_id = validated_data.get("company_id")

        if tenant_id is None and tenant is not None:
            tenant_id = tenant.pk

        if company_id is None and company is not None:
            company_id = company.pk

        if tenant is None and tenant_id is not None:
            Tenant = django_apps.get_model("tenancy", "Tenant")
            tenant = Tenant.objects.get(pk=tenant_id)

        # HQNATEX_ACCOUNTING_JOURNAL_SERIALIZER_RLS_SCOPE_CONTEXT_V1
        if tenant_id is not None and company_id is not None:
            set_rls_context(
                "default",
                tenant_id,
                company_id,
            )

        if company is None and company_id is not None:
            Company = django_apps.get_model("companies", "Company")
            company = Company.objects.get(pk=company_id)

        if tenant is None or company is None:
            raise serializers.ValidationError(
                {"entry_number": "Tenant/company scope is required for server journal numbering."}
            )

        entry_number = allocate_number(tenant_id=tenant_id, company_id=company_id, series_key=JOURNAL_SERIES_KEY)
        validated_data["entry_number"] = entry_number

        return super().create(validated_data)

