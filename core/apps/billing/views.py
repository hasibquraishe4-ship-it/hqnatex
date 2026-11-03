from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.audit.models import AuditLog
from apps.common.api import CompanyScopedReadOnlyModelViewSet, TenantScopedModelViewSet, CompanyScopedModelViewSet
from apps.common.permissions import TenantContextPermission, TenantRBACPermission
from .models import Invoice, Payment, PaymentAllocation, Receipt, Receivable
from .serializers import InvoiceSerializer, PaymentAllocationSerializer, PaymentSerializer, ReceiptSerializer, ReceivableSerializer
from .services import post_payment


class TenantReadOnlyViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, TenantContextPermission, TenantRBACPermission]
    permission_read = "billing.view"

    def permission_key_for_method(self, method):
        return self.permission_read

    def get_queryset(self):
        return super().get_queryset().filter(tenant_id=self.request.tenant_id)


class InvoiceViewSet(TenantReadOnlyViewSet):
    queryset = Invoice.objects.select_related(
        "company", "branch", "agency", "customer", "customer_service", "sale"
    ).prefetch_related("items").all()
    serializer_class = InvoiceSerializer


class ReceivableViewSet(CompanyScopedReadOnlyModelViewSet):
    queryset = Receivable.objects.select_related("company", "invoice", "customer").all()
    serializer_class = ReceivableSerializer
    permission_read = "billing.view"


class ReceiptViewSet(TenantReadOnlyViewSet):
    queryset = Receipt.objects.select_related("payment").all()
    serializer_class = ReceiptSerializer


class PaymentViewSet(CompanyScopedModelViewSet):
    queryset = Payment.objects.select_related("company", "branch", "agency", "customer").all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, *CompanyScopedModelViewSet.permission_classes]
    permission_read = "billing.view"
    permission_write = "billing.manage"

    def permission_key_for_method(self, method):
        if getattr(self, "action", None) == "post_payment":
            return "billing.payments.post"
        return super().permission_key_for_method(method)

    def perform_update(self, serializer):
        if serializer.instance.status == Payment.Status.POSTED:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"status": "Posted payment is immutable."})
        super().perform_update(serializer)

    @action(detail=True, methods=["post"], url_path="post")
    def post_payment(self, request, pk=None):
        payment = self.get_object()
        posted = post_payment(payment.id, actor=request.user)
        return Response(self.get_serializer(posted).data, status=status.HTTP_200_OK)


class PaymentAllocationViewSet(CompanyScopedModelViewSet):
    queryset = PaymentAllocation.objects.select_related("payment", "receivable", "receivable__invoice").all()
    serializer_class = PaymentAllocationSerializer
    permission_classes = [IsAuthenticated, *CompanyScopedModelViewSet.permission_classes]
    permission_read = "billing.view"
    permission_write = "billing.manage"

    def perform_update(self, serializer):
        if serializer.instance.payment.status != Payment.Status.DRAFT:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"payment": "Posted payment allocations are immutable."})
        super().perform_update(serializer)

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.payment.status != Payment.Status.DRAFT:
            return Response({"detail": "Posted payment allocations are immutable."}, status=405)
        object_id = obj.id
        payment_id = obj.payment_id
        with transaction.atomic():
            obj.delete()
            AuditLog.objects.create(
                tenant_id=request.tenant_id,
                actor=request.user,
                action="billing.allocation.delete_draft",
                object_type="billing.paymentallocation",
                object_id=object_id,
                metadata={"payment_id": str(payment_id)},
            )
        return Response(status=status.HTTP_204_NO_CONTENT)
