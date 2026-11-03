from decimal import Decimal

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.agencies.models import Agency
from apps.audit.models import AuditLog
from apps.companies.models import Company
from apps.governance.services import allocate_number
from apps.tenancy.models import Tenant

from .models import (
    AgencySettlement,
    AgencySettlementLine,
    RevenueAllocation,
    RevenueTransaction,
)


ZERO = Decimal("0.00")
SETTLEMENT_SERIES_KEY = "agency_settlement"


def _audit(
    *,
    tenant_id,
    actor,
    action,
    settlement,
    metadata=None,
):
    AuditLog.objects.create(
        tenant_id=tenant_id,
        actor=actor,
        action=action,
        object_type=settlement._meta.label_lower,
        object_id=settlement.id,
        metadata=metadata or {},
    )


def _scope(
    *,
    tenant_id,
    company_id,
):
    if not tenant_id:
        raise ValidationError(
            {
                "tenant":
                    "Tenant context is required."
            }
        )

    if not company_id:
        raise ValidationError(
            {
                "company":
                    "Company context is required."
            }
        )

    tenant = Tenant.objects.filter(
        id=tenant_id,
    ).first()

    if tenant is None:
        raise ValidationError(
            {
                "tenant":
                    "Invalid tenant context."
            }
        )

    company = Company.objects.filter(
        id=company_id,
        tenant_id=tenant_id,
    ).first()

    if company is None:
        raise ValidationError(
            {
                "company":
                    "Invalid company context."
            }
        )

    return tenant, company


def _line_amounts(revenue_transaction):
    allocations = {
        row.allocation_type:
            row.amount
        for row in
        revenue_transaction.allocations.all()
    }

    gross_key = (
        RevenueAllocation
        .AllocationType
        .AGENCY_GROSS
    )

    tax_key = (
        RevenueAllocation
        .AllocationType
        .AGENCY_TAX
    )

    net_key = (
        RevenueAllocation
        .AllocationType
        .AGENCY_NET
    )

    if gross_key not in allocations:
        raise ValidationError(
            {
                "allocations":
                    (
                        "Revenue transaction "
                        f"{revenue_transaction.id} "
                        "has no agency_gross allocation."
                    )
            }
        )

    if net_key not in allocations:
        raise ValidationError(
            {
                "allocations":
                    (
                        "Revenue transaction "
                        f"{revenue_transaction.id} "
                        "has no agency_net allocation."
                    )
            }
        )

    gross = allocations[gross_key]
    tax = allocations.get(
        tax_key,
        ZERO,
    )
    net = allocations[net_key]

    if gross - tax != net:
        raise ValidationError(
            {
                "allocations":
                    (
                        "Agency allocation math mismatch "
                        "for revenue transaction "
                        f"{revenue_transaction.id}."
                    )
            }
        )

    return gross, tax, net


def _totals_from_lines(settlement):
    rows = list(
        settlement.lines.filter(
            is_active=True,
        )
    )

    gross = sum(
        (
            row.gross_share_amount
            for row in rows
        ),
        ZERO,
    )

    tax = sum(
        (
            row.tax_amount
            for row in rows
        ),
        ZERO,
    )

    net = sum(
        (
            row.net_amount
            for row in rows
        ),
        ZERO,
    )

    return rows, gross, tax, net


@transaction.atomic
def create_agency_settlement(
    *,
    tenant_id,
    company_id,
    agency_id,
    period_start,
    period_end,
    currency="AFN",
    reference="",
    notes="",
    actor=None,
):
    tenant, company = _scope(
        tenant_id=tenant_id,
        company_id=company_id,
    )

    if period_end < period_start:
        raise ValidationError(
            {
                "period_end":
                    "Period end cannot be before period start."
            }
        )

    currency = (
        currency
        .strip()
        .upper()
    )

    agency = (
        Agency.objects
        .filter(
            id=agency_id,
            tenant_id=tenant_id,
            company_id=company_id,
        )
        .first()
    )

    if agency is None:
        raise ValidationError(
            {
                "agency_id":
                    "Agency is invalid for the current company."
            }
        )

    candidates = list(
        RevenueTransaction.objects
        .filter(
            tenant_id=tenant_id,
            company_id=company_id,
            agency_id=agency.id,
            status=RevenueTransaction.Status.POSTED,
            share_status=(
                RevenueTransaction
                .ShareStatus
                .ALLOCATED
            ),
            recognition_date__gte=period_start,
            recognition_date__lte=period_end,
            currency=currency,
        )
        .exclude(
            agency_settlement_lines__is_active=True,
        )
        .select_related(
            "share_rule",
        )
        .prefetch_related(
            "allocations",
        )
        .order_by(
            "recognition_date",
            "created_at",
        )
    )

    if not candidates:
        raise ValidationError(
            {
                "period":
                    (
                        "No unsettled allocated revenue "
                        "transactions were found for this "
                        "agency, period and currency."
                    )
            }
        )

    prepared = []

    gross_total = ZERO
    tax_total = ZERO
    net_total = ZERO

    for revenue_transaction in candidates:
        gross, tax, net = _line_amounts(
            revenue_transaction
        )

        prepared.append(
            (
                revenue_transaction,
                gross,
                tax,
                net,
            )
        )

        gross_total += gross
        tax_total += tax
        net_total += net

    if gross_total - tax_total != net_total:
        raise ValidationError(
            {
                "allocations":
                    "Settlement aggregate allocation math mismatch."
            }
        )

    settlement_number = allocate_number(
        tenant_id=tenant.id,
        company_id=company.id,
        series_key=SETTLEMENT_SERIES_KEY,
    )

    settlement = AgencySettlement.objects.create(
        tenant=tenant,
        company=company,
        agency=agency,
        settlement_number=settlement_number,
        period_start=period_start,
        period_end=period_end,
        currency=currency,
        status=AgencySettlement.Status.DRAFT,
        gross_share_amount=gross_total,
        tax_amount=tax_total,
        net_payable_amount=net_total,
        paid_amount=ZERO,
        balance_amount=net_total,
        reference=reference.strip(),
        notes=notes.strip(),
    )

    lines = [
        AgencySettlementLine(
            tenant=tenant,
            company=company,
            settlement=settlement,
            revenue_transaction=row,
            share_rule=row.share_rule,
            gross_share_amount=gross,
            tax_amount=tax,
            net_amount=net,
            currency=currency,
            is_active=True,
        )
        for (
            row,
            gross,
            tax,
            net,
        ) in prepared
    ]

    try:
        with transaction.atomic():
            AgencySettlementLine.objects.bulk_create(
                lines
            )
    except IntegrityError:
        raise ValidationError(
            {
                "lines":
                    (
                        "One or more revenue transactions "
                        "were settled concurrently. "
                        "Refresh and try again."
                    )
            }
        )

    _audit(
        tenant_id=tenant_id,
        actor=actor,
        action="revenue.agency_settlement.create",
        settlement=settlement,
        metadata={
            "agency_id": str(agency.id),
            "settlement_number":
                settlement.settlement_number,
            "period_start":
                str(period_start),
            "period_end":
                str(period_end),
            "currency":
                currency,
            "line_count":
                len(lines),
            "gross_share_amount":
                str(gross_total),
            "tax_amount":
                str(tax_total),
            "net_payable_amount":
                str(net_total),
        },
    )

    return settlement


@transaction.atomic
def approve_agency_settlement(
    *,
    settlement_id,
    tenant_id,
    company_id,
    actor=None,
    notes="",
):
    settlement = (
        AgencySettlement.objects
        .select_for_update()
        .filter(
            id=settlement_id,
            tenant_id=tenant_id,
            company_id=company_id,
        )
        .first()
    )

    if settlement is None:
        raise ValidationError(
            {
                "settlement":
                    "Settlement was not found."
            }
        )

    if settlement.status != AgencySettlement.Status.DRAFT:
        raise ValidationError(
            {
                "status":
                    "Only draft settlements can be approved."
            }
        )

    rows, gross, tax, net = (
        _totals_from_lines(
            settlement
        )
    )

    if not rows:
        raise ValidationError(
            {
                "lines":
                    "Settlement has no active lines."
            }
        )

    if gross - tax != net:
        raise ValidationError(
            {
                "lines":
                    "Settlement line math is invalid."
            }
        )

    settlement.gross_share_amount = gross
    settlement.tax_amount = tax
    settlement.net_payable_amount = net
    settlement.paid_amount = ZERO
    settlement.balance_amount = net
    settlement.status = (
        AgencySettlement.Status.APPROVED
    )
    settlement.approved_by_user_id = (
        getattr(
            actor,
            "id",
            None,
        )
    )
    settlement.approved_at = timezone.now()

    extra_notes = notes.strip()

    if extra_notes:
        settlement.notes = (
            (
                settlement.notes.rstrip()
                + "\n"
            )
            if settlement.notes
            else ""
        ) + extra_notes

    settlement.save(
        update_fields=[
            "gross_share_amount",
            "tax_amount",
            "net_payable_amount",
            "paid_amount",
            "balance_amount",
            "status",
            "approved_by_user_id",
            "approved_at",
            "notes",
            "updated_at",
        ]
    )

    _audit(
        tenant_id=tenant_id,
        actor=actor,
        action="revenue.agency_settlement.approve",
        settlement=settlement,
        metadata={
            "settlement_number":
                settlement.settlement_number,
            "line_count":
                len(rows),
            "net_payable_amount":
                str(net),
        },
    )

    return settlement


@transaction.atomic
def mark_agency_settlement_paid(
    *,
    settlement_id,
    tenant_id,
    company_id,
    actor=None,
    reference="",
    notes="",
):
    settlement = (
        AgencySettlement.objects
        .select_for_update()
        .filter(
            id=settlement_id,
            tenant_id=tenant_id,
            company_id=company_id,
        )
        .first()
    )

    if settlement is None:
        raise ValidationError(
            {
                "settlement":
                    "Settlement was not found."
            }
        )

    if (
        settlement.status
        != AgencySettlement.Status.APPROVED
    ):
        raise ValidationError(
            {
                "status":
                    (
                        "Only approved settlements "
                        "can be marked paid."
                    )
            }
        )

    settlement.paid_amount = (
        settlement.net_payable_amount
    )
    settlement.balance_amount = ZERO
    settlement.status = (
        AgencySettlement.Status.PAID
    )
    settlement.paid_at = timezone.now()

    new_reference = reference.strip()

    if new_reference:
        settlement.reference = new_reference

    extra_notes = notes.strip()

    if extra_notes:
        settlement.notes = (
            (
                settlement.notes.rstrip()
                + "\n"
            )
            if settlement.notes
            else ""
        ) + extra_notes

    settlement.save(
        update_fields=[
            "paid_amount",
            "balance_amount",
            "status",
            "paid_at",
            "reference",
            "notes",
            "updated_at",
        ]
    )

    _audit(
        tenant_id=tenant_id,
        actor=actor,
        action="revenue.agency_settlement.mark_paid",
        settlement=settlement,
        metadata={
            "settlement_number":
                settlement.settlement_number,
            "paid_amount":
                str(
                    settlement.paid_amount
                ),
            "reference":
                settlement.reference,
        },
    )

    return settlement


@transaction.atomic
def void_agency_settlement(
    *,
    settlement_id,
    tenant_id,
    company_id,
    actor=None,
    reason,
):
    settlement = (
        AgencySettlement.objects
        .select_for_update()
        .filter(
            id=settlement_id,
            tenant_id=tenant_id,
            company_id=company_id,
        )
        .first()
    )

    if settlement is None:
        raise ValidationError(
            {
                "settlement":
                    "Settlement was not found."
            }
        )

    if settlement.status == AgencySettlement.Status.PAID:
        raise ValidationError(
            {
                "status":
                    "Paid settlements cannot be voided."
            }
        )

    if settlement.status == AgencySettlement.Status.VOID:
        raise ValidationError(
            {
                "status":
                    "Settlement is already void."
            }
        )

    AgencySettlementLine.objects.filter(
        settlement=settlement,
        tenant_id=tenant_id,
        company_id=company_id,
        is_active=True,
    ).update(
        is_active=False,
    )

    settlement.status = (
        AgencySettlement.Status.VOID
    )

    clean_reason = reason.strip()

    settlement.notes = (
        (
            settlement.notes.rstrip()
            + "\n"
        )
        if settlement.notes
        else ""
    ) + (
        "VOID: "
        + clean_reason
    )

    settlement.save(
        update_fields=[
            "status",
            "notes",
            "updated_at",
        ]
    )

    _audit(
        tenant_id=tenant_id,
        actor=actor,
        action="revenue.agency_settlement.void",
        settlement=settlement,
        metadata={
            "settlement_number":
                settlement.settlement_number,
            "reason":
                clean_reason,
        },
    )

    return settlement
