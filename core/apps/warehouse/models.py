from django.conf import settings
from django.db import models

from apps.common.models import UUIDTimestampModel


class Warehouse(UUIDTimestampModel):
    tenant = models.ForeignKey(
        "tenancy.Tenant",
        on_delete=models.PROTECT,
        related_name="warehouse_locations",
    )
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.PROTECT,
        related_name="warehouse_locations",
    )
    branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.PROTECT,
        related_name="warehouse_locations",
        null=True,
        blank=True,
    )
    code = models.CharField(max_length=64)
    name = models.CharField(max_length=160)
    status = models.CharField(max_length=32, default="active")

    class Meta:
        ordering = ["code"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "company", "code"],
                name="uq_wh_scope_code",
            ),
        ]
        indexes = [
            models.Index(
                fields=["tenant", "company", "status"],
                name="ix_wh_scope_status",
            ),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"


class Supplier(UUIDTimestampModel):
    tenant = models.ForeignKey(
        "tenancy.Tenant",
        on_delete=models.PROTECT,
        related_name="warehouse_suppliers",
    )
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.PROTECT,
        related_name="warehouse_suppliers",
    )
    code = models.CharField(max_length=64)
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=64, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    address = models.TextField(blank=True, default="")
    status = models.CharField(max_length=32, default="active")

    class Meta:
        ordering = ["code"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "company", "code"],
                name="uq_wh_supplier_scope_code",
            ),
        ]
        indexes = [
            models.Index(
                fields=["tenant", "company", "status"],
                name="ix_wh_supplier_scope_status",
            ),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"


class InventoryItem(UUIDTimestampModel):
    tenant = models.ForeignKey(
        "tenancy.Tenant",
        on_delete=models.PROTECT,
        related_name="warehouse_inventory_items",
    )
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.PROTECT,
        related_name="warehouse_inventory_items",
    )
    sku = models.CharField(max_length=96)
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=120, blank=True, default="")
    unit = models.CharField(max_length=32, default="unit")
    serialized = models.BooleanField(default=False)
    minimum_stock = models.DecimalField(
        max_digits=18,
        decimal_places=4,
        default=0,
    )
    status = models.CharField(max_length=32, default="active")

    class Meta:
        ordering = ["sku"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "company", "sku"],
                name="uq_wh_item_scope_sku",
            ),
        ]
        indexes = [
            models.Index(
                fields=["tenant", "company", "status"],
                name="ix_wh_item_scope_status",
            ),
        ]

    def __str__(self):
        return f"{self.sku} - {self.name}"


class WarehouseStock(UUIDTimestampModel):
    tenant = models.ForeignKey(
        "tenancy.Tenant",
        on_delete=models.PROTECT,
        related_name="warehouse_stock_rows",
    )
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.PROTECT,
        related_name="warehouse_stock_rows",
    )
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name="stock_rows",
    )
    item = models.ForeignKey(
        InventoryItem,
        on_delete=models.PROTECT,
        related_name="stock_rows",
    )
    quantity = models.DecimalField(
        max_digits=18,
        decimal_places=4,
        default=0,
    )
    reserved_quantity = models.DecimalField(
        max_digits=18,
        decimal_places=4,
        default=0,
    )
    average_unit_cost = models.DecimalField(
        max_digits=18,
        decimal_places=4,
        default=0,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "tenant",
                    "company",
                    "warehouse",
                    "item",
                ],
                name="uq_wh_stock_scope_item",
            ),
        ]
        indexes = [
            models.Index(
                fields=["tenant", "company", "warehouse"],
                name="ix_wh_stock_scope_wh",
            ),
            models.Index(
                fields=["tenant", "company", "item"],
                name="ix_wh_stock_scope_item",
            ),
        ]

    def __str__(self):
        return f"{self.warehouse} / {self.item}"


class InventorySerial(UUIDTimestampModel):
    tenant = models.ForeignKey(
        "tenancy.Tenant",
        on_delete=models.PROTECT,
        related_name="warehouse_inventory_serials",
    )
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.PROTECT,
        related_name="warehouse_inventory_serials",
    )
    item = models.ForeignKey(
        InventoryItem,
        on_delete=models.PROTECT,
        related_name="serials",
    )
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name="serials",
    )
    serial_number = models.CharField(max_length=191)
    status = models.CharField(max_length=32, default="in_stock")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "tenant",
                    "company",
                    "serial_number",
                ],
                name="uq_wh_serial_scope_value",
            ),
        ]
        indexes = [
            models.Index(
                fields=[
                    "tenant",
                    "company",
                    "warehouse",
                    "status",
                ],
                name="ix_wh_serial_scope_status",
            ),
        ]

    def __str__(self):
        return self.serial_number


class StockMovement(UUIDTimestampModel):
    tenant = models.ForeignKey(
        "tenancy.Tenant",
        on_delete=models.PROTECT,
        related_name="warehouse_stock_movements",
    )
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.PROTECT,
        related_name="warehouse_stock_movements",
    )
    item = models.ForeignKey(
        InventoryItem,
        on_delete=models.PROTECT,
        related_name="stock_movements",
    )
    from_warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name="outgoing_movements",
        null=True,
        blank=True,
    )
    to_warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name="incoming_movements",
        null=True,
        blank=True,
    )
    movement_type = models.CharField(max_length=48)
    quantity = models.DecimalField(
        max_digits=18,
        decimal_places=4,
    )
    unit_cost = models.DecimalField(
        max_digits=18,
        decimal_places=4,
        null=True,
        blank=True,
    )
    reference_type = models.CharField(
        max_length=64,
        blank=True,
        default="",
    )
    reference_id = models.UUIDField(
        null=True,
        blank=True,
    )
    occurred_at = models.DateTimeField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="warehouse_stock_movements_created",
    )

    class Meta:
        ordering = ["-occurred_at", "-created_at"]
        indexes = [
            models.Index(
                fields=[
                    "tenant",
                    "company",
                    "occurred_at",
                ],
                name="ix_wh_move_scope_date",
            ),
            models.Index(
                fields=["tenant", "company", "item"],
                name="ix_wh_move_scope_item",
            ),
        ]

    def __str__(self):
        return f"{self.movement_type} - {self.item}"


class PurchaseRequest(UUIDTimestampModel):
    tenant = models.ForeignKey(
        "tenancy.Tenant",
        on_delete=models.PROTECT,
        related_name="warehouse_purchase_requests",
    )
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.PROTECT,
        related_name="warehouse_purchase_requests",
    )
    request_number = models.CharField(max_length=64)
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name="purchase_requests",
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="warehouse_purchase_requests_requested",
    )
    status = models.CharField(max_length=32, default="draft")
    request_date = models.DateField()
    notes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-request_date", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "tenant",
                    "company",
                    "request_number",
                ],
                name="uq_wh_pr_scope_number",
            ),
        ]
        indexes = [
            models.Index(
                fields=[
                    "tenant",
                    "company",
                    "status",
                    "request_date",
                ],
                name="ix_wh_pr_scope_status",
            ),
        ]

    def __str__(self):
        return self.request_number


class PurchaseRequestLine(UUIDTimestampModel):
    tenant = models.ForeignKey(
        "tenancy.Tenant",
        on_delete=models.PROTECT,
        related_name="warehouse_purchase_request_lines",
    )
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.PROTECT,
        related_name="warehouse_purchase_request_lines",
    )
    purchase_request = models.ForeignKey(
        PurchaseRequest,
        on_delete=models.CASCADE,
        related_name="lines",
    )
    item = models.ForeignKey(
        InventoryItem,
        on_delete=models.PROTECT,
        related_name="purchase_request_lines",
    )
    quantity = models.DecimalField(
        max_digits=18,
        decimal_places=4,
    )
    notes = models.TextField(blank=True, default="")

    class Meta:
        indexes = [
            models.Index(
                fields=[
                    "tenant",
                    "company",
                    "purchase_request",
                ],
                name="ix_wh_prline_scope_pr",
            ),
        ]

    def __str__(self):
        return f"{self.purchase_request} / {self.item}"


class PurchaseOrder(UUIDTimestampModel):
    tenant = models.ForeignKey(
        "tenancy.Tenant",
        on_delete=models.PROTECT,
        related_name="warehouse_purchase_orders",
    )
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.PROTECT,
        related_name="warehouse_purchase_orders",
    )
    order_number = models.CharField(max_length=64)
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name="purchase_orders",
    )
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name="purchase_orders",
    )
    purchase_request = models.ForeignKey(
        PurchaseRequest,
        on_delete=models.PROTECT,
        related_name="purchase_orders",
        null=True,
        blank=True,
    )
    status = models.CharField(max_length=32, default="draft")
    order_date = models.DateField()
    currency = models.CharField(max_length=3)
    total_amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="warehouse_purchase_orders_created",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="warehouse_purchase_orders_approved",
        null=True,
        blank=True,
    )
    approved_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-order_date", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "tenant",
                    "company",
                    "order_number",
                ],
                name="uq_wh_po_scope_number",
            ),
        ]
        indexes = [
            models.Index(
                fields=[
                    "tenant",
                    "company",
                    "status",
                    "order_date",
                ],
                name="ix_wh_po_scope_status",
            ),
        ]

    def __str__(self):
        return self.order_number


class PurchaseOrderLine(UUIDTimestampModel):
    tenant = models.ForeignKey(
        "tenancy.Tenant",
        on_delete=models.PROTECT,
        related_name="warehouse_purchase_order_lines",
    )
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.PROTECT,
        related_name="warehouse_purchase_order_lines",
    )
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name="lines",
    )
    item = models.ForeignKey(
        InventoryItem,
        on_delete=models.PROTECT,
        related_name="purchase_order_lines",
    )
    quantity = models.DecimalField(
        max_digits=18,
        decimal_places=4,
    )
    unit_price = models.DecimalField(
        max_digits=18,
        decimal_places=4,
    )
    line_total = models.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    class Meta:
        indexes = [
            models.Index(
                fields=[
                    "tenant",
                    "company",
                    "purchase_order",
                ],
                name="ix_wh_poline_scope_po",
            ),
        ]

    def __str__(self):
        return f"{self.purchase_order} / {self.item}"


class GoodsReceipt(UUIDTimestampModel):
    tenant = models.ForeignKey(
        "tenancy.Tenant",
        on_delete=models.PROTECT,
        related_name="warehouse_goods_receipts",
    )
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.PROTECT,
        related_name="warehouse_goods_receipts",
    )
    receipt_number = models.CharField(max_length=64)
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.PROTECT,
        related_name="goods_receipts",
        null=True,
        blank=True,
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name="goods_receipts",
    )
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name="goods_receipts",
    )
    received_at = models.DateTimeField()
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="warehouse_goods_receipts_received",
    )
    status = models.CharField(max_length=32, default="draft")
    notes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-received_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "tenant",
                    "company",
                    "receipt_number",
                ],
                name="uq_wh_gr_scope_number",
            ),
        ]
        indexes = [
            models.Index(
                fields=[
                    "tenant",
                    "company",
                    "status",
                    "received_at",
                ],
                name="ix_wh_gr_scope_status",
            ),
        ]

    def __str__(self):
        return self.receipt_number


class GoodsReceiptLine(UUIDTimestampModel):
    tenant = models.ForeignKey(
        "tenancy.Tenant",
        on_delete=models.PROTECT,
        related_name="warehouse_goods_receipt_lines",
    )
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.PROTECT,
        related_name="warehouse_goods_receipt_lines",
    )
    goods_receipt = models.ForeignKey(
        GoodsReceipt,
        on_delete=models.CASCADE,
        related_name="lines",
    )
    item = models.ForeignKey(
        InventoryItem,
        on_delete=models.PROTECT,
        related_name="goods_receipt_lines",
    )
    quantity = models.DecimalField(
        max_digits=18,
        decimal_places=4,
    )
    unit_cost = models.DecimalField(
        max_digits=18,
        decimal_places=4,
    )

    class Meta:
        indexes = [
            models.Index(
                fields=[
                    "tenant",
                    "company",
                    "goods_receipt",
                ],
                name="ix_wh_grline_scope_gr",
            ),
        ]

    def __str__(self):
        return f"{self.goods_receipt} / {self.item}"


# HQNATEX_AP_V1C37_MODELS_BEGIN
from decimal import Decimal as _APDecimal
import uuid as _ap_uuid

from django.core.exceptions import ValidationError as _APValidationError
from django.db import models as _ap_models
from django.db.models import F as _APF
from django.db.models import Q as _APQ
from django.db.models import Sum as _APSum


class SupplierInvoice(_ap_models.Model):
    class Status(_ap_models.TextChoices):
        DRAFT = "draft", "Draft"
        OPEN = "open", "Open"
        PARTIAL = "partial", "Partial"
        PAID = "paid", "Paid"
        VOID = "void", "Void"

    id = _ap_models.UUIDField(
        primary_key=True,
        default=_ap_uuid.uuid4,
        editable=False,
    )

    tenant = _ap_models.ForeignKey(
        "tenancy.Tenant",
        on_delete=_ap_models.PROTECT,
        related_name="warehouse_supplier_invoices",
    )

    company = _ap_models.ForeignKey(
        "companies.Company",
        on_delete=_ap_models.PROTECT,
        related_name="warehouse_supplier_invoices",
    )

    supplier = _ap_models.ForeignKey(
        "warehouse.Supplier",
        on_delete=_ap_models.PROTECT,
        related_name="supplier_invoices",
    )

    purchase_order = _ap_models.ForeignKey(
        "warehouse.PurchaseOrder",
        on_delete=_ap_models.PROTECT,
        related_name="supplier_invoices",
        null=True,
        blank=True,
    )

    goods_receipt = _ap_models.ForeignKey(
        "warehouse.GoodsReceipt",
        on_delete=_ap_models.PROTECT,
        related_name="supplier_invoices",
        null=True,
        blank=True,
    )

    document_number = _ap_models.CharField(
        max_length=64,
    )

    supplier_reference = _ap_models.CharField(
        max_length=128,
        blank=True,
        default="",
    )

    invoice_date = _ap_models.DateField()

    due_date = _ap_models.DateField()

    currency = _ap_models.CharField(
        max_length=3,
    )

    total_amount = _ap_models.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    status = _ap_models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.DRAFT,
    )

    created_at = _ap_models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = _ap_models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        constraints = [
            _ap_models.UniqueConstraint(
                fields=[
                    "tenant",
                    "company",
                    "document_number",
                ],
                name="uq_wh_si_scope_num",
            ),

            _ap_models.CheckConstraint(
                condition=_APQ(
                    total_amount__gte=0
                ),
                name="ck_wh_si_total_nonneg",
            ),

            _ap_models.CheckConstraint(
                condition=_APQ(
                    due_date__gte=_APF(
                        "invoice_date"
                    )
                ),
                name="ck_wh_si_due_date",
            ),
        ]

        indexes = [
            _ap_models.Index(
                fields=[
                    "tenant",
                    "company",
                    "status",
                ],
                name="ix_wh_si_scope_status",
            ),

            _ap_models.Index(
                fields=[
                    "tenant",
                    "company",
                    "supplier",
                    "status",
                ],
                name="ix_wh_si_supplier_status",
            ),

            _ap_models.Index(
                fields=[
                    "tenant",
                    "company",
                    "due_date",
                ],
                name="ix_wh_si_due",
            ),
        ]

        ordering = [
            "-invoice_date",
            "-created_at",
        ]

    def clean(self):
        errors = {}

        if (
            self.purchase_order_id
            and self.supplier_id
            and self.purchase_order.supplier_id
            != self.supplier_id
        ):
            errors[
                "purchase_order"
            ] = (
                "Purchase order supplier "
                "does not match invoice supplier."
            )

        if (
            self.goods_receipt_id
            and self.supplier_id
            and self.goods_receipt.supplier_id
            != self.supplier_id
        ):
            errors[
                "goods_receipt"
            ] = (
                "Goods receipt supplier "
                "does not match invoice supplier."
            )

        if (
            self.purchase_order_id
            and self.goods_receipt_id
            and self.goods_receipt.purchase_order_id
            != self.purchase_order_id
        ):
            errors[
                "goods_receipt"
            ] = (
                "Goods receipt does not belong "
                "to purchase order."
            )

        if errors:
            raise _APValidationError(
                errors
            )

    @property
    def allocated_amount(self):
        cached = getattr(
            self,
            "_ap_allocated_amount",
            None,
        )

        if cached is not None:
            return cached

        value = self.payment_allocations.aggregate(
            total=_APSum(
                "amount"
            )
        )[
            "total"
        ]

        return (
            value
            if value is not None
            else _APDecimal("0")
        )

    @property
    def open_balance(self):
        return max(
            (
                self.total_amount
                - self.allocated_amount
            ),
            _APDecimal("0"),
        )


class SupplierPaymentAllocation(_ap_models.Model):
    id = _ap_models.UUIDField(
        primary_key=True,
        default=_ap_uuid.uuid4,
        editable=False,
    )

    tenant = _ap_models.ForeignKey(
        "tenancy.Tenant",
        on_delete=_ap_models.PROTECT,
        related_name="warehouse_supplier_payment_allocations",
    )

    company = _ap_models.ForeignKey(
        "companies.Company",
        on_delete=_ap_models.PROTECT,
        related_name="warehouse_supplier_payment_allocations",
    )

    supplier_invoice = _ap_models.ForeignKey(
        "warehouse.SupplierInvoice",
        on_delete=_ap_models.CASCADE,
        related_name="payment_allocations",
    )

    cash_bank_transaction = _ap_models.ForeignKey(
        "treasury.CashBankTransaction",
        on_delete=_ap_models.PROTECT,
        related_name="supplier_payment_allocations",
    )

    amount = _ap_models.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    created_at = _ap_models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = _ap_models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        constraints = [
            _ap_models.UniqueConstraint(
                fields=[
                    "supplier_invoice",
                    "cash_bank_transaction",
                ],
                name="uq_wh_spa_inv_tx",
            ),

            _ap_models.CheckConstraint(
                condition=_APQ(
                    amount__gt=0
                ),
                name="ck_wh_spa_amt_pos",
            ),
        ]

        indexes = [
            _ap_models.Index(
                fields=[
                    "supplier_invoice",
                ],
                name="ix_wh_spa_invoice",
            ),

            _ap_models.Index(
                fields=[
                    "cash_bank_transaction",
                ],
                name="ix_wh_spa_tx",
            ),
        ]
# HQNATEX_AP_V1C37_MODELS_END
