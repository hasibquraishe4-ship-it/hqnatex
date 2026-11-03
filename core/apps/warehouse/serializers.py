from rest_framework import serializers

from .models import (
    GoodsReceipt,
    GoodsReceiptLine,
    InventoryItem,
    InventorySerial,
    PurchaseOrder,
    PurchaseOrderLine,
    PurchaseRequest,
    PurchaseRequestLine,
    StockMovement,
    Supplier,
    Warehouse,
    WarehouseStock,
)


class CompanyScopedRelationValidationMixin:
    scoped_relation_fields = ()

    def _request_scope(self):
        request = self.context.get("request")

        if request is None:
            return None, None

        tenant_id = getattr(
            request,
            "tenant_id",
            None,
        )

        company_id = getattr(
            request,
            "company_id",
            None,
        )

        if company_id is None:
            company = getattr(
                request,
                "company",
                None,
            )

            company_id = getattr(
                company,
                "id",
                None,
            )

        return tenant_id, company_id

    def validate(self, attrs):
        attrs = super().validate(attrs)

        tenant_id, company_id = self._request_scope()

        if tenant_id is None:
            raise serializers.ValidationError(
                {
                    "tenant": (
                        "Active tenant context is required."
                    )
                }
            )

        if company_id is None:
            raise serializers.ValidationError(
                {
                    "company": (
                        "Active company context is required."
                    )
                }
            )

        for field_name in self.scoped_relation_fields:
            related = attrs.get(
                field_name,
                getattr(
                    self.instance,
                    field_name,
                    None,
                ),
            )

            if related is None:
                continue

            related_tenant_id = getattr(
                related,
                "tenant_id",
                None,
            )

            related_company_id = getattr(
                related,
                "company_id",
                None,
            )

            if (
                related_tenant_id is not None
                and str(related_tenant_id)
                != str(tenant_id)
            ):
                raise serializers.ValidationError(
                    {
                        field_name: (
                            f"{field_name} belongs to another tenant."
                        )
                    }
                )

            if (
                related_company_id is not None
                and str(related_company_id)
                != str(company_id)
            ):
                raise serializers.ValidationError(
                    {
                        field_name: (
                            f"{field_name} belongs to another company."
                        )
                    }
                )

        return attrs


class WarehouseSerializer(
    CompanyScopedRelationValidationMixin,
    serializers.ModelSerializer,
):
    scoped_relation_fields = (
        "branch",
    )

    class Meta:
        model = Warehouse
        fields = [
            field.name
            for field in Warehouse._meta.fields
        ]
        read_only_fields = [
            "id",
            "tenant",
            "company",
            "created_at",
            "updated_at",
        ]


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = [
            field.name
            for field in Supplier._meta.fields
        ]
        read_only_fields = [
            "id",
            "tenant",
            "company",
            "created_at",
            "updated_at",
        ]


class InventoryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryItem
        fields = [
            field.name
            for field in InventoryItem._meta.fields
        ]
        read_only_fields = [
            "id",
            "tenant",
            "company",
            "created_at",
            "updated_at",
        ]


class WarehouseStockSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(
        source="item.name",
        read_only=True,
    )
    item_sku = serializers.CharField(
        source="item.sku",
        read_only=True,
    )
    warehouse_name = serializers.CharField(
        source="warehouse.name",
        read_only=True,
    )

    class Meta:
        model = WarehouseStock
        fields = [
            field.name
            for field in WarehouseStock._meta.fields
        ] + [
            "item_name",
            "item_sku",
            "warehouse_name",
        ]
        read_only_fields = fields


class InventorySerialSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(
        source="item.name",
        read_only=True,
    )
    item_sku = serializers.CharField(
        source="item.sku",
        read_only=True,
    )
    warehouse_name = serializers.CharField(
        source="warehouse.name",
        read_only=True,
    )

    class Meta:
        model = InventorySerial
        fields = [
            field.name
            for field in InventorySerial._meta.fields
        ] + [
            "item_name",
            "item_sku",
            "warehouse_name",
        ]
        read_only_fields = fields


class StockMovementSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(
        source="item.name",
        read_only=True,
    )
    item_sku = serializers.CharField(
        source="item.sku",
        read_only=True,
    )
    from_warehouse_name = serializers.CharField(
        source="from_warehouse.name",
        read_only=True,
        allow_null=True,
    )
    to_warehouse_name = serializers.CharField(
        source="to_warehouse.name",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = StockMovement
        fields = [
            field.name
            for field in StockMovement._meta.fields
        ] + [
            "item_name",
            "item_sku",
            "from_warehouse_name",
            "to_warehouse_name",
        ]
        read_only_fields = fields


class PurchaseRequestLineSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(
        source="item.name",
        read_only=True,
    )
    item_sku = serializers.CharField(
        source="item.sku",
        read_only=True,
    )

    class Meta:
        model = PurchaseRequestLine
        fields = [
            field.name
            for field in PurchaseRequestLine._meta.fields
        ] + [
            "item_name",
            "item_sku",
        ]
        read_only_fields = fields


class PurchaseRequestSerializer(serializers.ModelSerializer):
    lines = PurchaseRequestLineSerializer(
        many=True,
        read_only=True,
    )
    warehouse_name = serializers.CharField(
        source="warehouse.name",
        read_only=True,
    )

    class Meta:
        model = PurchaseRequest
        fields = [
            field.name
            for field in PurchaseRequest._meta.fields
        ] + [
            "warehouse_name",
            "lines",
        ]
        read_only_fields = fields


class PurchaseOrderLineSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(
        source="item.name",
        read_only=True,
    )
    item_sku = serializers.CharField(
        source="item.sku",
        read_only=True,
    )

    class Meta:
        model = PurchaseOrderLine
        fields = [
            field.name
            for field in PurchaseOrderLine._meta.fields
        ] + [
            "item_name",
            "item_sku",
        ]
        read_only_fields = fields


class PurchaseOrderSerializer(serializers.ModelSerializer):
    lines = PurchaseOrderLineSerializer(
        many=True,
        read_only=True,
    )
    supplier_name = serializers.CharField(
        source="supplier.name",
        read_only=True,
    )
    warehouse_name = serializers.CharField(
        source="warehouse.name",
        read_only=True,
    )

    class Meta:
        model = PurchaseOrder
        fields = [
            field.name
            for field in PurchaseOrder._meta.fields
        ] + [
            "supplier_name",
            "warehouse_name",
            "lines",
        ]
        read_only_fields = fields


class GoodsReceiptLineSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(
        source="item.name",
        read_only=True,
    )
    item_sku = serializers.CharField(
        source="item.sku",
        read_only=True,
    )

    class Meta:
        model = GoodsReceiptLine
        fields = [
            field.name
            for field in GoodsReceiptLine._meta.fields
        ] + [
            "item_name",
            "item_sku",
        ]
        read_only_fields = fields


class GoodsReceiptSerializer(serializers.ModelSerializer):
    lines = GoodsReceiptLineSerializer(
        many=True,
        read_only=True,
    )
    supplier_name = serializers.CharField(
        source="supplier.name",
        read_only=True,
    )
    warehouse_name = serializers.CharField(
        source="warehouse.name",
        read_only=True,
    )

    class Meta:
        model = GoodsReceipt
        fields = [
            field.name
            for field in GoodsReceipt._meta.fields
        ] + [
            "supplier_name",
            "warehouse_name",
            "lines",
        ]
        read_only_fields = fields


# HQNATEX_AP_V1C37_SERIALIZERS_BEGIN
from decimal import Decimal as _APDecimal

from django.db import transaction as _ap_transaction
from django.db.models import Sum as _APSum
from django.utils import timezone as _ap_timezone
from rest_framework import serializers as _ap_serializers

from .models import SupplierInvoice as _APSupplierInvoice
from .models import SupplierPaymentAllocation as _APSupplierPaymentAllocation

from .services import (
    allocate_number_for_supplier_invoice,
    create_supplier_payment_allocation_with_outbound_direction_posted_status_source_type_source_id_and_open_partial_paid_invoice_status_and_post_source_event,
)


class SupplierInvoiceSerializer(_ap_serializers.ModelSerializer):
    allocated_amount = _ap_serializers.SerializerMethodField()
    open_balance = _ap_serializers.SerializerMethodField()
    days_overdue = _ap_serializers.SerializerMethodField()

    class Meta:
        model = _APSupplierInvoice

        fields = [
            "id",
            "tenant",
            "company",
            "supplier",
            "purchase_order",
            "goods_receipt",
            "document_number",
            "supplier_reference",
            "invoice_date",
            "due_date",
            "currency",
            "total_amount",
            "status",
            "allocated_amount",
            "open_balance",
            "days_overdue",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "tenant",
            "company",
            "allocated_amount",
            "open_balance",
            "days_overdue",
            "created_at",
            "updated_at",
        ]

    def _allocated(self, obj):
        cached = getattr(
            obj,
            "_ap_allocated_amount",
            None,
        )

        if cached is not None:
            return cached

        value = obj.payment_allocations.aggregate(
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

    def get_allocated_amount(self, obj):
        return self._allocated(
            obj
        )

    def get_open_balance(self, obj):
        return max(
            (
                obj.total_amount
                - self._allocated(
                    obj
                )
            ),
            _APDecimal("0"),
        )

    def get_days_overdue(self, obj):
        if self.get_open_balance(
            obj
        ) <= 0:
            return 0

        return max(
            (
                _ap_timezone.localdate()
                - obj.due_date
            ).days,
            0,
        )

    def validate(self, attrs):
        instance = self.instance

        supplier = attrs.get(
            "supplier",
            getattr(
                instance,
                "supplier",
                None,
            ),
        )

        purchase_order = attrs.get(
            "purchase_order",
            getattr(
                instance,
                "purchase_order",
                None,
            ),
        )

        goods_receipt = attrs.get(
            "goods_receipt",
            getattr(
                instance,
                "goods_receipt",
                None,
            ),
        )

        invoice_date = attrs.get(
            "invoice_date",
            getattr(
                instance,
                "invoice_date",
                None,
            ),
        )

        due_date = attrs.get(
            "due_date",
            getattr(
                instance,
                "due_date",
                None,
            ),
        )

        if (
            invoice_date
            and due_date
            and due_date
            < invoice_date
        ):
            raise _ap_serializers.ValidationError(
                {
                    "due_date":
                        "Due date cannot precede invoice date."
                }
            )

        if (
            supplier
            and purchase_order
            and purchase_order.supplier_id
            != supplier.id
        ):
            raise _ap_serializers.ValidationError(
                {
                    "purchase_order":
                        "Purchase order supplier mismatch."
                }
            )

        if (
            supplier
            and goods_receipt
            and goods_receipt.supplier_id
            != supplier.id
        ):
            raise _ap_serializers.ValidationError(
                {
                    "goods_receipt":
                        "Goods receipt supplier mismatch."
                }
            )

        if (
            purchase_order
            and goods_receipt
            and goods_receipt.purchase_order_id
            != purchase_order.id
        ):
            raise _ap_serializers.ValidationError(
                {
                    "goods_receipt":
                        "Goods receipt does not belong to purchase order."
                }
            )

        scoped_objects = [
            obj
            for obj in [
                supplier,
                purchase_order,
                goods_receipt,
            ]
            if obj is not None
        ]

        if scoped_objects:
            tenant_ids = {
                obj.tenant_id
                for obj
                in scoped_objects
            }

            company_ids = {
                obj.company_id
                for obj
                in scoped_objects
            }

            if len(
                tenant_ids
            ) != 1:
                raise _ap_serializers.ValidationError(
                    "Cross-tenant AP reference forbidden."
                )

            if len(
                company_ids
            ) != 1:
                raise _ap_serializers.ValidationError(
                    "Cross-company AP reference forbidden."
                )

        return attrs

    def create(self, validated_data):
        validated_data = allocate_number_for_supplier_invoice(
            validated_data
        )

        return super().create(
            validated_data
        )


class SupplierPaymentAllocationSerializer(_ap_serializers.ModelSerializer):
    class Meta:
        model = _APSupplierPaymentAllocation

        fields = [
            "id",
            "tenant",
            "company",
            "supplier_invoice",
            "cash_bank_transaction",
            "amount",
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
        invoice = attrs.get(
            "supplier_invoice",
            getattr(
                self.instance,
                "supplier_invoice",
                None,
            ),
        )

        transaction = attrs.get(
            "cash_bank_transaction",
            getattr(
                self.instance,
                "cash_bank_transaction",
                None,
            ),
        )

        amount = attrs.get(
            "amount",
            getattr(
                self.instance,
                "amount",
                None,
            ),
        )

        if (
            amount is not None
            and amount <= 0
        ):
            raise _ap_serializers.ValidationError(
                {
                    "amount":
                        "Allocation amount must be positive."
                }
            )

        if invoice and transaction:
            if (
                invoice.tenant_id
                != transaction.tenant_id
            ):
                raise _ap_serializers.ValidationError(
                    "Treasury transaction tenant mismatch."
                )

            if (
                invoice.company_id
                != transaction.company_id
            ):
                raise _ap_serializers.ValidationError(
                    "Treasury transaction company mismatch."
                )

            if (
                invoice.currency
                != transaction.currency
            ):
                raise _ap_serializers.ValidationError(
                    "Treasury transaction currency mismatch."
                )

        return attrs

    def _v1c45_base_create(self, validated_data):
        requested_invoice = validated_data[
            "supplier_invoice"
        ]

        transaction = validated_data[
            "cash_bank_transaction"
        ]

        amount = validated_data[
            "amount"
        ]

        with _ap_transaction.atomic():
            invoice = (
                _APSupplierInvoice.objects
                .select_for_update()
                .get(
                    pk=requested_invoice.pk
                )
            )

            already = (
                invoice.payment_allocations.aggregate(
                    total=_APSum(
                        "amount"
                    )
                )[
                    "total"
                ]
                or _APDecimal("0")
            )

            if (
                already
                + amount
                > invoice.total_amount
            ):
                raise _ap_serializers.ValidationError(
                    {
                        "amount":
                            "Allocation exceeds invoice open balance."
                    }
                )

            if (
                invoice.tenant_id
                != transaction.tenant_id
                or invoice.company_id
                != transaction.company_id
            ):
                raise _ap_serializers.ValidationError(
                    "Cross-scope allocation forbidden."
                )

            if (
                invoice.currency
                != transaction.currency
            ):
                raise _ap_serializers.ValidationError(
                    "Allocation currency mismatch."
                )

            validated_data[
                "supplier_invoice"
            ] = invoice

            validated_data[
                "tenant"
            ] = invoice.tenant

            validated_data[
                "company"
            ] = invoice.company

            return (
                _APSupplierPaymentAllocation.objects.create(
                    **validated_data
                )
            )

    def create(self, validated_data):
        return create_supplier_payment_allocation_with_outbound_direction_posted_status_source_type_source_id_and_open_partial_paid_invoice_status_and_post_source_event(
            validated_data=validated_data,
            base_create=self._v1c45_base_create,
        )
# HQNATEX_AP_V1C37_SERIALIZERS_END
