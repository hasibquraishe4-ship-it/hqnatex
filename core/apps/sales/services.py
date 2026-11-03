from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.audit.models import AuditLog
from apps.billing.models import Invoice, InvoiceItem, Receivable
from apps.revenue.models import RevenueAllocation, RevenueTransaction, ShareRule
from apps.sales.models import Sale, SaleItem


MONEY = Decimal("0.01")
PERCENT = Decimal("100")


def qmoney(value):
    return Decimal(value or 0).quantize(MONEY, rounding=ROUND_HALF_UP)


def _effective_share_rule(sale, item):
    service = item.service or (item.package.service if item.package_id else None)
    if not item.share_eligible:
        return None
    if service is None:
        raise ValidationError({"share_rule": f"Sale item {item.line_no} is share-eligible but has no service."})

    qs = ShareRule.objects.filter(
        tenant_id=sale.tenant_id,
        company_id=sale.company_id,
        service=service,
        status=ShareRule.Status.ACTIVE,
        effective_from__lte=sale.sale_date,
    ).filter(Q(effective_to__isnull=True) | Q(effective_to__gte=sale.sale_date))

    if sale.agency_id:
        qs = qs.filter(agency_id=sale.agency_id)
    else:
        qs = qs.filter(agency__isnull=True)

    rules = list(qs.order_by("-effective_from", "-created_at")[:2])
    if not rules:
        raise ValidationError(
            {"share_rule": f"No effective share rule for service {service.code}, agency/date context."}
        )
    if len(rules) > 1:
        raise ValidationError(
            {"share_rule": f"Overlapping effective share rules detected for service {service.code}."}
        )
    return rules[0]


def _snapshot_allocations(revenue, rule):
    gross = qmoney(revenue.gross_amount)
    partner = qmoney(gross * Decimal(rule.partner_share_percent) / PERCENT)
    company = qmoney(gross * Decimal(rule.company_base_share_percent) / PERCENT)
    agency_gross = qmoney(gross * Decimal(rule.agency_gross_share_percent) / PERCENT)
    agency_tax = (
        qmoney(agency_gross * Decimal(rule.agency_tax_percent) / PERCENT)
        if rule.agency_tax_enabled
        else Decimal("0.00")
    )
    agency_net = qmoney(agency_gross - agency_tax)

    rows = [
        (RevenueAllocation.AllocationType.PARTNER, rule.partner_share_percent, partner),
        (RevenueAllocation.AllocationType.COMPANY_BASE, rule.company_base_share_percent, company),
        (RevenueAllocation.AllocationType.AGENCY_GROSS, rule.agency_gross_share_percent, agency_gross),
        (
            RevenueAllocation.AllocationType.AGENCY_TAX,
            rule.agency_tax_percent if rule.agency_tax_enabled else Decimal("0"),
            agency_tax,
        ),
        (RevenueAllocation.AllocationType.AGENCY_NET, None, agency_net),
    ]
    for allocation_type, percent, amount in rows:
        RevenueAllocation.objects.update_or_create(
            tenant_id=revenue.tenant_id,
            revenue_transaction=revenue,
            allocation_type=allocation_type,
            defaults={
                "share_rule": rule,
                "percent": percent,
                "amount": amount,
                "currency": revenue.currency,
            },
        )


@transaction.atomic
def post_sale(sale_id, actor=None):
    sale = Sale.objects.select_for_update(of=("self",)).select_related(
        "company", "branch", "agency", "customer", "customer_service"
    ).get(pk=sale_id)

    if sale.status == Sale.Status.POSTED:
        return sale
    if sale.status != Sale.Status.DRAFT:
        raise ValidationError({"status": "Only draft sales can be posted."})

    items = list(
        SaleItem.objects.select_for_update(of=("self",))
        .filter(tenant_id=sale.tenant_id, sale=sale)
        .select_related("service", "package", "package__service")
        .order_by("line_no")
    )
    if not items:
        raise ValidationError({"items": "A sale must have at least one item."})

    if qmoney(sale.discount_amount) != Decimal("0.00"):
        raise ValidationError(
            {"discount_amount": "FULL-03 requires zero sale-level discount until an allocation rule is configured."}
        )

    sale.recalculate_totals(save=False)
    if qmoney(sale.total) <= 0:
        raise ValidationError({"total": "Sale total must be greater than zero."})

    if sale.customer_service_id and sale.customer_service.customer_id != sale.customer_id:
        raise ValidationError({"customer_service": "Customer service does not belong to the sale customer."})
    if sale.branch_id and sale.branch.company_id != sale.company_id:
        raise ValidationError({"branch": "Branch does not belong to the sale company."})
    if sale.agency_id and sale.agency.company_id != sale.company_id:
        raise ValidationError({"agency": "Agency does not belong to the sale company."})

    rules = {}
    for item in items:
        if item.item_type == SaleItem.ItemType.EQUIPMENT:
            raise ValidationError(
                {"items": "Equipment sale remains blocked until Warehouse Product/Stock/Serial is canonical in FULL-05."}
            )
        if item.share_eligible:
            rules[item.id] = _effective_share_rule(sale, item)

    sale.status = Sale.Status.POSTED
    sale.posted_at = timezone.now()
    sale.save(update_fields=["subtotal", "total", "status", "posted_at", "updated_at"])

    invoice, _ = Invoice.objects.get_or_create(
        tenant_id=sale.tenant_id,
        sale=sale,
        defaults={
            "company": sale.company,
            "branch": sale.branch,
            "agency": sale.agency,
            "customer": sale.customer,
            "customer_service": sale.customer_service,
            "invoice_number": f"INV-{sale.sale_number}",
            "status": Invoice.Status.ISSUED,
            "issue_date": sale.sale_date,
            "currency": sale.currency,
            "subtotal": sale.subtotal,
            "discount_amount": sale.discount_amount,
            "total": sale.total,
        },
    )

    for item in items:
        InvoiceItem.objects.get_or_create(
            tenant_id=sale.tenant_id,
            invoice=invoice,
            line_no=item.line_no,
            defaults={
                "sale_item": item,
                "item_type": item.item_type,
                "description_snapshot": item.description_snapshot,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "line_total": item.line_total,
            },
        )

    Receivable.objects.get_or_create(
        tenant_id=sale.tenant_id,
        invoice=invoice,
        defaults={
            "customer": sale.customer,
            "original_amount": invoice.total,
            "currency": invoice.currency,
            "status": Receivable.Status.OPEN,
        },
    )

    for item in items:
        rule = rules.get(item.id)
        service = item.service or (item.package.service if item.package_id else None)
        revenue, _ = RevenueTransaction.objects.get_or_create(
            tenant_id=sale.tenant_id,
            sale_item=item,
            defaults={
                "company": sale.company,
                "branch": sale.branch,
                "agency": sale.agency,
                "sale": sale,
                "customer": sale.customer,
                "customer_service": sale.customer_service,
                "service": service,
                "share_rule": rule,
                "revenue_number": f"REV-{sale.sale_number}-{item.line_no:03d}",
                "revenue_type": item.item_type,
                "recognition_date": sale.sale_date,
                "gross_amount": item.line_total,
                "currency": sale.currency,
                "status": RevenueTransaction.Status.POSTED,
                "share_status": (
                    RevenueTransaction.ShareStatus.ALLOCATED
                    if rule is not None
                    else RevenueTransaction.ShareStatus.NOT_APPLICABLE
                ),
            },
        )
        if rule is not None:
            _snapshot_allocations(revenue, rule)

    AuditLog.objects.create(
        tenant_id=sale.tenant_id,
        actor=actor,
        action="sales.post",
        object_type=sale._meta.label_lower,
        object_id=sale.id,
        metadata={
            "sale_number": sale.sale_number,
            "invoice_number": invoice.invoice_number,
            "payment_is_revenue": False,
        },
    )
    return sale
