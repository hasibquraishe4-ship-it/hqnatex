from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Mapping
from uuid import UUID

from django.apps import apps
from django.db import IntegrityError, transaction
from django.db.models import Min, Q

from apps.accounting.expression import evaluate_amount_expression
from apps.governance.services import allocate_number
from apps.platform_tenancy_v3.rls import set_rls_context


class PostingEngineError(Exception):
    """Base exception for posting-engine failures."""


class PostingConfigurationError(PostingEngineError):
    """Required accounting configuration is missing or invalid."""


class PostingRuleNotFound(PostingConfigurationError):
    """No eligible posting rule exists for the requested event/date."""


class PostingRuleAmbiguous(PostingConfigurationError):
    """More than one rule exists at the winning priority."""


class PostingValidationError(PostingEngineError):
    """Source or derived journal data is invalid."""


class PostingPeriodError(PostingValidationError):
    """Posting date is outside one uniquely open and unlocked period."""


@dataclass(frozen=True)
class PostingResult:
    posting_record_id: UUID
    journal_entry_id: UUID
    entry_number: str
    created: bool


@dataclass(frozen=True)
class PreparedPostingLine:
    account_id: UUID
    account_code: str
    direction: str
    amount: Decimal


def _as_uuid(value, *, field_name: str) -> UUID:
    try:
        return UUID(str(value))
    except (TypeError, ValueError, AttributeError) as exc:
        raise PostingValidationError(
            f"{field_name} must be a valid UUID."
        ) from exc


def _as_posting_date(value) -> date:
    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, date):
        return value

    raise PostingValidationError(
        "posting_date must be a date."
    )


def _validate_source_key(
    *,
    source_domain: str,
    source_event: str,
) -> tuple[str, str]:
    domain = str(source_domain or "").strip()
    event = str(source_event or "").strip()

    if not domain:
        raise PostingValidationError(
            "source_domain is required."
        )

    if not event:
        raise PostingValidationError(
            "source_event is required."
        )

    if len(domain) > 80:
        raise PostingValidationError(
            "source_domain exceeds 80 characters."
        )

    if len(event) > 120:
        raise PostingValidationError(
            "source_event exceeds 120 characters."
        )

    return domain, event


def _get_finance_account_model():
    for model in apps.get_app_config(
        "finance"
    ).get_models():
        if model._meta.db_table == "finance_accounts":
            return model

    raise PostingConfigurationError(
        "finance_accounts model is unavailable."
    )


def _validate_company_scope(
    *,
    tenant_id: UUID,
    company_id: UUID,
) -> None:
    Company = apps.get_model(
        "companies",
        "Company",
    )

    exists = Company.objects.filter(
        id=company_id,
        tenant_id=tenant_id,
    ).exists()

    if not exists:
        raise PostingValidationError(
            "Company does not exist in the requested tenant scope."
        )


def _get_existing_posting(
    *,
    tenant_id: UUID,
    company_id: UUID,
    source_domain: str,
    source_event: str,
    source_id: UUID,
):
    PostingRecord = apps.get_model(
        "accounting",
        "AccountingPostingRecord",
    )

    return (
        PostingRecord.objects
        .select_related("journal_entry")
        .filter(
            tenant_id=tenant_id,
            company_id=company_id,
            source_domain=source_domain,
            source_event=source_event,
            source_id=source_id,
        )
        .first()
    )


def _result_from_existing(record) -> PostingResult:
    return PostingResult(
        posting_record_id=record.id,
        journal_entry_id=record.journal_entry_id,
        entry_number=record.journal_entry.entry_number,
        created=False,
    )


def _select_posting_rule(
    *,
    tenant_id: UUID,
    company_id: UUID,
    source_domain: str,
    source_event: str,
    posting_date: date,
):
    Rule = apps.get_model(
        "accounting",
        "AccountingPostingRule",
    )

    candidates = Rule.objects.filter(
        tenant_id=tenant_id,
        company_id=company_id,
        source_domain=source_domain,
        source_event=source_event,
        is_active=True,
        approved_at__isnull=False,
        approved_by_user_id__isnull=False,
        effective_from__lte=posting_date,
    ).filter(
        Q(effective_to__isnull=True)
        | Q(effective_to__gte=posting_date)
    )

    winning_priority = candidates.aggregate(
        value=Min("priority")
    )["value"]

    if winning_priority is None:
        raise PostingRuleNotFound(
            "No active, approved, effective posting rule "
            "matches this source event."
        )

    winners = list(
        candidates
        .filter(priority=winning_priority)
        .order_by("id")[:2]
    )

    if len(winners) != 1:
        raise PostingRuleAmbiguous(
            "Multiple posting rules exist at the winning "
            "priority. Resolve the configuration explicitly."
        )

    return winners[0]


def _load_rule_lines(
    *,
    tenant_id: UUID,
    company_id: UUID,
    rule_id: UUID,
):
    RuleLine = apps.get_model(
        "accounting",
        "AccountingPostingRuleLine",
    )

    lines = list(
        RuleLine.objects.filter(
            tenant_id=tenant_id,
            company_id=company_id,
            posting_rule_id=rule_id,
        ).order_by(
            "line_no",
            "id",
        )
    )

    if not lines:
        raise PostingConfigurationError(
            "The selected posting rule has no lines."
        )

    return lines


def _validate_period(
    *,
    tenant_id: UUID,
    company_id: UUID,
    posting_date: date,
):
    AccountingPeriod = apps.get_model(
        "accounting",
        "AccountingPeriod",
    )

    AccountingPeriodLock = apps.get_model(
        "accounting",
        "AccountingPeriodLock",
    )

    periods = list(
        AccountingPeriod.objects.filter(
            tenant_id=tenant_id,
            company_id=company_id,
            start_date__lte=posting_date,
            end_date__gte=posting_date,
        )
    )

    if not periods:
        raise PostingPeriodError(
            "No accounting period covers the posting date."
        )

    open_periods = [
        period
        for period in periods
        if period.status
        == AccountingPeriod.Status.OPEN
    ]

    if len(open_periods) != 1:
        raise PostingPeriodError(
            "Posting date must belong to exactly one open "
            "accounting period."
        )

    period = open_periods[0]

    locked = AccountingPeriodLock.objects.filter(
        tenant_id=tenant_id,
        company_id=company_id,
        period_id=period.id,
        released_at__isnull=True,
    ).exists()

    if locked:
        raise PostingPeriodError(
            "The accounting period is locked."
        )

    return period


def _normalise_amount(
    value,
    *,
    line_no: int,
) -> Decimal:
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise PostingValidationError(
            f"Posting line {line_no} produced an invalid amount."
        ) from exc

    if not amount.is_finite():
        raise PostingValidationError(
            f"Posting line {line_no} produced a non-finite amount."
        )

    if amount < Decimal("0"):
        raise PostingValidationError(
            f"Posting line {line_no} produced a negative amount."
        )

    return amount


def _prepare_posting_lines(
    *,
    tenant_id: UUID,
    company_id: UUID,
    rule_lines,
    amount_context: Mapping[str, object],
) -> list[PreparedPostingLine]:
    Account = _get_finance_account_model()

    account_ids = {
        _as_uuid(
            line.account_id,
            field_name="posting_rule_line.account_id",
        )
        for line in rule_lines
    }

    accounts = {
        account.id: account
        for account in Account.objects.filter(
            tenant_id=tenant_id,
            company_id=company_id,
            id__in=account_ids,
        )
    }

    missing_accounts = sorted(
        str(account_id)
        for account_id in account_ids
        if account_id not in accounts
    )

    if missing_accounts:
        raise PostingConfigurationError(
            "One or more posting-rule accounts do not exist "
            "inside the requested tenant/company scope: "
            + ", ".join(missing_accounts)
        )

    prepared: list[PreparedPostingLine] = []

    for line in rule_lines:
        side = str(
            line.side or ""
        ).strip().lower()

        if side not in {
            "debit",
            "credit",
        }:
            raise PostingConfigurationError(
                f"Posting rule line {line.line_no} has invalid side "
                f"{line.side!r}; expected debit or credit."
            )

        if line.cost_center_required:
            raise PostingConfigurationError(
                f"Posting rule line {line.line_no} requires a cost "
                "center, but the current JournalEntryLine schema "
                "does not persist cost-center dimensions."
            )

        if line.dimensions_json:
            raise PostingConfigurationError(
                f"Posting rule line {line.line_no} defines dimensions, "
                "but the current JournalEntryLine schema does not "
                "persist posting dimensions."
            )

        account_id = _as_uuid(
            line.account_id,
            field_name="posting_rule_line.account_id",
        )

        account = accounts[account_id]

        if (
            account.status != "active"
            or not account.is_posting
        ):
            raise PostingConfigurationError(
                f"Account {account.code} is inactive or non-posting."
            )

        try:
            raw_amount = evaluate_amount_expression(
                line.amount_expression,
                amount_context,
            )
        except Exception as exc:
            raise PostingConfigurationError(
                f"Amount expression failed for posting rule "
                f"line {line.line_no}: {exc}"
            ) from exc

        amount = _normalise_amount(
            raw_amount,
            line_no=line.line_no,
        )

        # Zero-value optional lines are not persisted.
        if amount == Decimal("0"):
            continue

        prepared.append(
            PreparedPostingLine(
                account_id=account.id,
                account_code=account.code,
                direction=side,
                amount=amount,
            )
        )

    if not prepared:
        raise PostingValidationError(
            "Posting rule produced no non-zero journal lines."
        )

    debit_total = sum(
        (
            item.amount
            for item in prepared
            if item.direction == "debit"
        ),
        Decimal("0"),
    )

    credit_total = sum(
        (
            item.amount
            for item in prepared
            if item.direction == "credit"
        ),
        Decimal("0"),
    )

    if debit_total != credit_total:
        raise PostingValidationError(
            "Posting rule produced an unbalanced journal entry: "
            f"debit={debit_total}, credit={credit_total}."
        )

    return prepared


def _lock_journal_numbering(
    *,
    tenant_id: UUID,
    company_id: UUID,
):
    NumberingSeries = apps.get_model(
        "governance",
        "NumberingSeries",
    )

    series = (
        NumberingSeries.objects
        .select_for_update()
        .filter(
            tenant_id=tenant_id,
            company_id=company_id,
            series_key="journal",
            is_active=True,
        )
        .first()
    )

    if series is None:
        raise PostingConfigurationError(
            "Active journal numbering is not configured for "
            "this company."
        )

    return series


@transaction.atomic
def post_source_event(
    *,
    tenant_id,
    company_id,
    source_domain: str,
    source_event: str,
    source_id,
    posting_date,
    description: str,
    amount_context: Mapping[str, object],
) -> PostingResult:
    """
    Convert one already-resolved business event into one posted journal.

    Commercial calculations are intentionally outside this service.
    amount_context must contain final values prepared by the source domain
    (for example RevenueAllocation results).

    Idempotency key:
        tenant + company + source_domain + source_event + source_id

    Priority:
        lower integer wins; ties at the winning priority hard-fail.
    """

    tenant_id = _as_uuid(
        tenant_id,
        field_name="tenant_id",
    )

    company_id = _as_uuid(
        company_id,
        field_name="company_id",
    )

    source_id = _as_uuid(
        source_id,
        field_name="source_id",
    )

    source_domain, source_event = (
        _validate_source_key(
            source_domain=source_domain,
            source_event=source_event,
        )
    )

    posting_date = _as_posting_date(
        posting_date
    )

    description = str(
        description or ""
    ).strip()

    if not description:
        raise PostingValidationError(
            "description is required."
        )

    if not isinstance(
        amount_context,
        Mapping,
    ):
        raise PostingValidationError(
            "amount_context must be a mapping."
        )

    # All scoped reads/writes below occur under one transaction-local
    # tenant/company RLS context.
    set_rls_context(
        "default",
        tenant_id,
        company_id,
    )

    _validate_company_scope(
        tenant_id=tenant_id,
        company_id=company_id,
    )

    existing = _get_existing_posting(
        tenant_id=tenant_id,
        company_id=company_id,
        source_domain=source_domain,
        source_event=source_event,
        source_id=source_id,
    )

    if existing is not None:
        return _result_from_existing(
            existing
        )

    rule = _select_posting_rule(
        tenant_id=tenant_id,
        company_id=company_id,
        source_domain=source_domain,
        source_event=source_event,
        posting_date=posting_date,
    )

    rule_lines = _load_rule_lines(
        tenant_id=tenant_id,
        company_id=company_id,
        rule_id=rule.id,
    )

    _validate_period(
        tenant_id=tenant_id,
        company_id=company_id,
        posting_date=posting_date,
    )

    prepared_lines = _prepare_posting_lines(
        tenant_id=tenant_id,
        company_id=company_id,
        rule_lines=rule_lines,
        amount_context=amount_context,
    )

    # Serialize journal number allocation per company. This also provides
    # a deterministic race boundary before the second idempotency check.
    _lock_journal_numbering(
        tenant_id=tenant_id,
        company_id=company_id,
    )

    existing = _get_existing_posting(
        tenant_id=tenant_id,
        company_id=company_id,
        source_domain=source_domain,
        source_event=source_event,
        source_id=source_id,
    )

    if existing is not None:
        return _result_from_existing(
            existing
        )

    entry_number = allocate_number(
        tenant_id=tenant_id,
        company_id=company_id,
        series_key="journal",
    )

    JournalEntry = apps.get_model(
        "accounting",
        "JournalEntry",
    )

    JournalEntryLine = apps.get_model(
        "accounting",
        "JournalEntryLine",
    )

    PostingRecord = apps.get_model(
        "accounting",
        "AccountingPostingRecord",
    )

    journal = JournalEntry.objects.create(
        tenant_id=tenant_id,
        company_id=company_id,
        entry_number=entry_number,
        entry_date=posting_date,
        description=description,
        status=JournalEntry.Status.DRAFT,
    )

    for item in prepared_lines:
        JournalEntryLine.objects.create(
            tenant_id=tenant_id,
            company_id=company_id,
            journal_entry=journal,
            account_code=item.account_code,
            amount=item.amount,
            direction=item.direction,
        )

    journal.status = JournalEntry.Status.POSTED

    journal.save(
        update_fields=[
            "status",
            "updated_at",
        ]
    )

    try:
        with transaction.atomic():
            record = PostingRecord.objects.create(
                tenant_id=tenant_id,
                company_id=company_id,
                source_domain=source_domain,
                source_event=source_event,
                source_id=source_id,
                journal_entry=journal,
            )

    except IntegrityError:
        # The unique idempotency constraint remains the final DB-level
        # race guard. Nested atomic keeps the outer transaction usable.
        journal.delete()

        existing = _get_existing_posting(
            tenant_id=tenant_id,
            company_id=company_id,
            source_domain=source_domain,
            source_event=source_event,
            source_id=source_id,
        )

        if existing is None:
            raise

        return _result_from_existing(
            existing
        )

    return PostingResult(
        posting_record_id=record.id,
        journal_entry_id=journal.id,
        entry_number=journal.entry_number,
        created=True,
    )
