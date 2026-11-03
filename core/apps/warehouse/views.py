from apps.common.api import CompanyScopedModelViewSet

from .models import (
    GoodsReceipt,
    InventoryItem,
    InventorySerial,
    PurchaseOrder,
    PurchaseRequest,
    StockMovement,
    Supplier,
    Warehouse,
    WarehouseStock,
)
from .serializers import (
    GoodsReceiptSerializer,
    InventoryItemSerializer,
    InventorySerialSerializer,
    PurchaseOrderSerializer,
    PurchaseRequestSerializer,
    StockMovementSerializer,
    SupplierSerializer,
    WarehouseSerializer,
    WarehouseStockSerializer,
)


class WarehouseCompanyScopedViewSet(
    CompanyScopedModelViewSet
):
    permission_read = "warehouse.view"
    permission_write = "warehouse.manage"


class WarehouseReadOnlyCompanyScopedViewSet(
    WarehouseCompanyScopedViewSet
):
    permission_write = None

    http_method_names = [
        "get",
        "head",
        "options",
    ]


class WarehouseViewSet(
    WarehouseCompanyScopedViewSet
):
    queryset = (
        Warehouse.objects
        .select_related(
            "tenant",
            "company",
            "branch",
        )
        .all()
    )

    serializer_class = WarehouseSerializer


class SupplierViewSet(
    WarehouseCompanyScopedViewSet
):
    queryset = (
        Supplier.objects
        .select_related(
            "tenant",
            "company",
        )
        .all()
    )

    serializer_class = SupplierSerializer


class InventoryItemViewSet(
    WarehouseCompanyScopedViewSet
):
    queryset = (
        InventoryItem.objects
        .select_related(
            "tenant",
            "company",
        )
        .all()
    )

    serializer_class = InventoryItemSerializer


class WarehouseStockViewSet(
    WarehouseReadOnlyCompanyScopedViewSet
):
    queryset = (
        WarehouseStock.objects
        .select_related(
            "tenant",
            "company",
            "warehouse",
            "item",
        )
        .all()
    )

    serializer_class = WarehouseStockSerializer


class InventorySerialViewSet(
    WarehouseReadOnlyCompanyScopedViewSet
):
    queryset = (
        InventorySerial.objects
        .select_related(
            "tenant",
            "company",
            "warehouse",
            "item",
        )
        .all()
    )

    serializer_class = InventorySerialSerializer


class StockMovementViewSet(
    WarehouseReadOnlyCompanyScopedViewSet
):
    queryset = (
        StockMovement.objects
        .select_related(
            "tenant",
            "company",
            "item",
            "from_warehouse",
            "to_warehouse",
            "created_by",
        )
        .all()
    )

    serializer_class = StockMovementSerializer


class PurchaseRequestViewSet(
    WarehouseReadOnlyCompanyScopedViewSet
):
    queryset = (
        PurchaseRequest.objects
        .select_related(
            "tenant",
            "company",
            "warehouse",
            "requested_by",
        )
        .prefetch_related(
            "lines",
            "lines__item",
        )
        .all()
    )

    serializer_class = PurchaseRequestSerializer


class PurchaseOrderViewSet(
    WarehouseReadOnlyCompanyScopedViewSet
):
    queryset = (
        PurchaseOrder.objects
        .select_related(
            "tenant",
            "company",
            "supplier",
            "warehouse",
            "purchase_request",
            "created_by",
            "approved_by",
        )
        .prefetch_related(
            "lines",
            "lines__item",
        )
        .all()
    )

    serializer_class = PurchaseOrderSerializer


class GoodsReceiptViewSet(
    WarehouseReadOnlyCompanyScopedViewSet
):
    queryset = (
        GoodsReceipt.objects
        .select_related(
            "tenant",
            "company",
            "purchase_order",
            "supplier",
            "warehouse",
            "received_by",
        )
        .prefetch_related(
            "lines",
            "lines__item",
        )
        .all()
    )

    serializer_class = GoodsReceiptSerializer


# HQNATEX_AP_V1C37_VIEWS_BEGIN
from decimal import Decimal as _APDecimal

from django.db.models import DecimalField as _APDecimalField
from django.db.models import Sum as _APSum
from django.db.models import Value as _APValue
from django.db.models.functions import Coalesce as _APCoalesce

from .models import SupplierInvoice as _APSupplierInvoice
from .models import SupplierPaymentAllocation as _APSupplierPaymentAllocation
from .serializers import SupplierInvoiceSerializer as _APSupplierInvoiceSerializer
from .serializers import SupplierPaymentAllocationSerializer as _APSupplierPaymentAllocationSerializer


class SupplierInvoiceViewSet(WarehouseCompanyScopedViewSet):
    http_method_names = ["get", "post", "head", "options"]
    queryset = (
        _APSupplierInvoice.objects
        .select_related(
            "supplier",
            "purchase_order",
            "goods_receipt",
        )
        .annotate(
            _ap_allocated_amount=_APCoalesce(
                _APSum(
                    "payment_allocations__amount"
                ),
                _APValue(
                    _APDecimal("0")
                ),
                output_field=_APDecimalField(
                    max_digits=18,
                    decimal_places=2,
                ),
            )
        )
    )

    serializer_class = _APSupplierInvoiceSerializer


class SupplierPaymentAllocationViewSet(WarehouseCompanyScopedViewSet):
    http_method_names = ["get", "post", "head", "options"]
    queryset = (
        _APSupplierPaymentAllocation.objects
        .select_related(
            "supplier_invoice",
            "cash_bank_transaction",
        )
    )

    serializer_class = _APSupplierPaymentAllocationSerializer
# HQNATEX_AP_V1C37_VIEWS_END
