from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.audit.models import AuditLog
from .models import Invoice, Payment, PaymentAllocation, Receipt, Receivable


MONEY = Decimal("0.01")


def qmoney(value):
    return Decimal(value or 0).quantize(MONEY, rounding=ROUND_HALF_UP)


def refresh_receivable_status(receivable):
    outstanding = receivable.outstanding_amount
    if outstanding <= 0:
        receivable.status = Receivable.Status.PAID
        invoice_status = Invoice.Status.PAID
    elif outstanding < qmoney(receivable.original_amount):
        receivable.status = Receivable.Status.PARTIAL
        invoice_status = Invoice.Status.PARTIAL
    else:
        receivable.status = Receivable.Status.OPEN
        invoice_status = Invoice.Status.ISSUED
    receivable.save(update_fields=["status", "updated_at"])
    Invoice.objects.filter(
        pk=receivable.invoice_id,
        tenant_id=receivable.tenant_id,
        company_id=receivable.company_id,
    ).update(status=invoice_status, updated_at=timezone.now())


@transaction.atomic
def post_payment(payment_id, actor=None):
    payment = Payment.objects.select_for_update(of=("self",)).select_related(
        "company", "branch", "agency", "customer"
    ).get(pk=payment_id)

    if payment.status == Payment.Status.POSTED:
        return payment
    if payment.status != Payment.Status.DRAFT:
        raise ValidationError({"status": "Only draft payments can be posted."})

    allocations = list(
        PaymentAllocation.objects.select_for_update(of=("self",))
        .filter(
            tenant_id=payment.tenant_id,
            company_id=payment.company_id,
            payment=payment,
        )
        .select_related("receivable", "receivable__invoice")
    )
    if not allocations:
        raise ValidationError({"allocations": "Payment must be allocated to at least one receivable."})

    allocated_total = qmoney(sum((row.amount for row in allocations), Decimal("0")))
    if allocated_total != qmoney(payment.amount):
        raise ValidationError(
            {"allocations": f"Allocated amount {allocated_total} must equal payment amount {qmoney(payment.amount)}."}
        )

    locked_receivables = {}
    for allocation in allocations:
        if allocation.company_id != payment.company_id:
            raise ValidationError({"allocations": "Payment allocation belongs to another company."})
        receivable = Receivable.objects.select_for_update(of=("self",)).select_related("invoice").get(
            pk=allocation.receivable_id,
            tenant_id=payment.tenant_id,
            company_id=payment.company_id,
        )
        locked_receivables[receivable.id] = receivable
        if receivable.tenant_id != payment.tenant_id:
            raise ValidationError({"receivable": "Receivable belongs to another tenant."})
        if receivable.company_id != payment.company_id:
            raise ValidationError({"receivable": "Receivable belongs to another company."})
        if receivable.customer_id != payment.customer_id:
            raise ValidationError({"receivable": "Receivable belongs to another customer."})
        if receivable.currency != payment.currency:
            raise ValidationError({"currency": "Payment and receivable currencies must match."})
        other_posted = (
            PaymentAllocation.objects.filter(
                tenant_id=payment.tenant_id,
                company_id=payment.company_id,
                receivable=receivable,
                payment__company_id=payment.company_id,
                payment__status=Payment.Status.POSTED,
            )
            .exclude(payment=payment)
            .aggregate(v=Sum("amount"))["v"]
            or Decimal("0")
        )
        available = qmoney(receivable.original_amount - other_posted)
        if qmoney(allocation.amount) > available:
            raise ValidationError(
                {"allocations": f"Allocation exceeds outstanding amount for invoice {receivable.invoice.invoice_number}."}
            )

    payment.status = Payment.Status.POSTED
    payment.posted_at = timezone.now()
    payment.treasury_status = Payment.TreasuryStatus.PENDING
    payment.save(update_fields=["status", "posted_at", "treasury_status", "updated_at"])

    Receipt.objects.get_or_create(
        tenant_id=payment.tenant_id,
        company_id=payment.company_id,
        payment=payment,
        defaults={
            "receipt_number": f"RCT-{payment.payment_number}",
            "status": Receipt.Status.ACTIVE,
            "amount": payment.amount,
            "currency": payment.currency,
        },
    )

    for receivable in locked_receivables.values():
        refresh_receivable_status(receivable)

    AuditLog.objects.create(
        tenant_id=payment.tenant_id,
        actor=actor,
        action="billing.payment.post",
        object_type=payment._meta.label_lower,
        object_id=payment.id,
        metadata={
            "payment_number": payment.payment_number,
            "treasury_status": payment.treasury_status,
            "creates_revenue": False,
        },
    )
    return payment
