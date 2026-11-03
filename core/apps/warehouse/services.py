# V1C45_AP_WRITE_PATH_REPAIR_BEGIN

from decimal import Decimal

from django.db import router, transaction
from django.db.models import Sum
from rest_framework import serializers

from apps.accounting.posting_service import post_source_event
from apps.governance.services import allocate_number
from apps.treasury.models import (
    CASH_BANK_TRANSACTION_OUTBOUND_DIRECTION,
    CASH_BANK_TRANSACTION_POSTED_STATUS,
    CashBankTransaction,
)

from .models import SupplierInvoice, SupplierPaymentAllocation
from apps.treasury.models import CASH_BANK_TRANSACTION_OUTBOUND_DIRECTION, CASH_BANK_TRANSACTION_POSTED_STATUS
from rest_framework.exceptions import ValidationError as APWritePathValidationError


AP_TREASURY_DIRECTION_VALUE = CASH_BANK_TRANSACTION_OUTBOUND_DIRECTION
AP_TREASURY_STATUS_VALUE = CASH_BANK_TRANSACTION_POSTED_STATUS
SUPPLIER_INVOICE_NUMBERING_SERIES_KEY = 'supplier_invoice'


def _object_pk(value):
    return getattr(value, "pk", value)


def allocate_number_for_supplier_invoice(validated_data):
    tenant = validated_data.get("tenant")
    company = validated_data.get("company")

    if tenant is None or company is None:
        raise serializers.ValidationError(
            {
                "document_number":
                    "Tenant and company are required before supplier invoice numbering."
            }
        )

    validated_data["document_number"] = allocate_number(
        tenant_id=_object_pk(tenant),
        company_id=_object_pk(company),
        series_key=SUPPLIER_INVOICE_NUMBERING_SERIES_KEY,
        database_alias=router.db_for_write(SupplierInvoice),
    )

    return validated_data


def _lock_invoice(invoice):
    return (
        SupplierInvoice.objects
        .select_for_update()
        .get(pk=_object_pk(invoice))
    )


def _lock_treasury_transaction(tx):
    return (
        CashBankTransaction.objects
        .select_for_update()
        .get(pk=_object_pk(tx))
    )


def _sum_invoice_allocations(invoice):
    value = (
        SupplierPaymentAllocation.objects
        .filter(supplier_invoice=invoice)
        .aggregate(total=Sum("amount"))
        .get("total")
    )

    return value or Decimal("0")


def _sum_transaction_allocations(tx):
    value = (
        SupplierPaymentAllocation.objects
        .filter(cash_bank_transaction=tx)
        .aggregate(total=Sum("amount"))
        .get("total")
    )

    return value or Decimal("0")


def _validate_outbound_direction_posted_status_source_type_source_id(
    *,
    invoice,
    treasury_transaction,
    amount,
):
    if treasury_transaction.tenant_id != invoice.tenant_id:
        raise serializers.ValidationError(
            {
                "cash_bank_transaction":
                    "Treasury transaction tenant does not match supplier invoice tenant."
            }
        )

    if treasury_transaction.company_id != invoice.company_id:
        raise serializers.ValidationError(
            {
                "cash_bank_transaction":
                    "Treasury transaction company does not match supplier invoice company."
            }
        )

    if treasury_transaction.currency != invoice.currency:
        raise serializers.ValidationError(
            {
                "cash_bank_transaction":
                    "Treasury transaction currency does not match supplier invoice currency."
            }
        )

    if treasury_transaction.direction != AP_TREASURY_DIRECTION_VALUE:
        raise serializers.ValidationError(
            {
                "cash_bank_transaction":
                    "Treasury transaction direction is not the certified outbound direction."
            }
        )

    if treasury_transaction.status != AP_TREASURY_STATUS_VALUE:
        raise serializers.ValidationError(
            {
                "cash_bank_transaction":
                    "Treasury transaction is not in the certified posted status."
            }
        )

    if amount is None or amount <= 0:
        raise serializers.ValidationError(
            {
                "amount":
                    "Allocation amount must be greater than zero."
            }
        )

    already_allocated = _sum_transaction_allocations(
        treasury_transaction
    )

    if already_allocated + amount > treasury_transaction.amount:
        raise serializers.ValidationError(
            {
                "amount":
                    "Allocation exceeds the treasury transaction amount."
            }
        )

    canonical_source_type = SupplierInvoice._meta.label_lower
    canonical_source_id = str(invoice.pk)

    existing_source_type = (
        treasury_transaction.source_type
        or ""
    )

    existing_source_id = (
        str(treasury_transaction.source_id)
        if treasury_transaction.source_id
        else ""
    )

    if existing_source_type not in (
        "",
        canonical_source_type,
    ):
        raise serializers.ValidationError(
            {
                "cash_bank_transaction":
                    "Treasury transaction is already bound to another source type."
            }
        )

    if existing_source_id not in (
        "",
        canonical_source_id,
    ):
        raise serializers.ValidationError(
            {
                "cash_bank_transaction":
                    "Treasury transaction is already bound to another source record."
            }
        )


def _bind_treasury_source(
    *,
    invoice,
    treasury_transaction,
):
    expected_type = SupplierInvoice._meta.label_lower
    expected_id = str(invoice.pk)

    changed = []

    if treasury_transaction.source_type != expected_type:
        treasury_transaction.source_type = expected_type
        changed.append("source_type")

    if str(treasury_transaction.source_id or "") != expected_id:
        treasury_transaction.source_id = invoice.pk
        changed.append("source_id")

    if changed:
        treasury_transaction.save(
            update_fields=changed
        )


def sync_open_partial_paid_invoice_status(invoice):
    allocated = _sum_invoice_allocations(
        invoice
    )

    if allocated <= 0:
        new_status = "open"

    elif allocated >= invoice.total_amount:
        new_status = "paid"

    else:
        new_status = "partial"

    if invoice.status != new_status:
        invoice.status = new_status
        invoice.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

    return invoice


def _post_source_event_for_supplier_payment_allocation(
    *,
    allocation,
    treasury_transaction,
):
    post_source_event(
        tenant_id=allocation.tenant_id,
        company_id=allocation.company_id,
        source_domain=SupplierPaymentAllocation._meta.app_label,
        source_event=SupplierPaymentAllocation._meta.model_name,
        source_id=allocation.pk,
        posting_date=treasury_transaction.transaction_date,
        description=(
            "Supplier payment allocation "
            f"{allocation.pk}"
        ),
        amount_context={
            "amount": allocation.amount,
        },
    )


def create_supplier_payment_allocation_with_outbound_direction_posted_status_source_type_source_id_and_open_partial_paid_invoice_status_and_post_source_event(
    *,
    validated_data,
    base_create,
):
    with transaction.atomic():
        invoice = _lock_invoice(
            validated_data["supplier_invoice"]
        )

        treasury_transaction = _lock_treasury_transaction(
            validated_data["cash_bank_transaction"]
        )

        # HQNATEX_AP_TREASURY_CANONICAL_GUARD_V1C47_R2
        if treasury_transaction.direction != CASH_BANK_TRANSACTION_OUTBOUND_DIRECTION:
            raise APWritePathValidationError({"cash_bank_transaction": "TREASURY_DIRECTION_MUST_BE_OUTBOUND"})
        if treasury_transaction.status != CASH_BANK_TRANSACTION_POSTED_STATUS:
            raise APWritePathValidationError({"cash_bank_transaction": "TREASURY_STATUS_MUST_BE_POSTED"})

        amount = validated_data.get(
            "amount"
        )

        _validate_outbound_direction_posted_status_source_type_source_id(
            invoice=invoice,
            treasury_transaction=treasury_transaction,
            amount=amount,
        )

        if invoice.status not in (
            "open",
            "partial",
        ):
            raise serializers.ValidationError(
                {
                    "supplier_invoice":
                        "Only open or partially paid supplier invoices can receive allocations."
                }
            )

        current_allocated = _sum_invoice_allocations(
            invoice
        )

        if current_allocated + amount > invoice.total_amount:
            raise serializers.ValidationError(
                {
                    "amount":
                        "Allocation exceeds supplier invoice open balance."
                }
            )

        validated_data["supplier_invoice"] = invoice
        validated_data["cash_bank_transaction"] = treasury_transaction

        allocation = base_create(
            validated_data
        )

        _bind_treasury_source(
            invoice=invoice,
            treasury_transaction=treasury_transaction,
        )

        sync_open_partial_paid_invoice_status(
            invoice
        )

        _post_source_event_for_supplier_payment_allocation(
            allocation=allocation,
            treasury_transaction=treasury_transaction,
        )

        return allocation

# V1C45_AP_WRITE_PATH_REPAIR_END
