from django.db import transaction
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.audit.models import AuditLog
from apps.common.api import TenantScopedModelViewSet
from .models import Sale, SaleItem
from .serializers import SaleItemSerializer, SaleSerializer
from .services import post_sale


class SaleViewSet(TenantScopedModelViewSet):
    queryset = Sale.objects.select_related(
        "company", "branch", "agency", "customer", "customer_service"
    ).prefetch_related("items").all()
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated, *TenantScopedModelViewSet.permission_classes]
    permission_read = "sales.view"
    permission_write = "sales.manage"

    def permission_key_for_method(self, method):
        if getattr(self, "action", None) == "post_sale":
            return "sales.post"
        return super().permission_key_for_method(method)

    def perform_update(self, serializer):
        if serializer.instance.status == Sale.Status.POSTED:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"status": "Posted sale is immutable."})
        super().perform_update(serializer)

    @action(detail=True, methods=["post"], url_path="post")
    def post_sale(self, request, pk=None):
        sale = self.get_object()

        unavailable_lines = []

        for item in sale.items.select_related(
            "service",
            "package",
            "package__service",
        ).all():
            if (
                item.service_id
                and item.service.status
                != "active"
            ):
                unavailable_lines.append(
                    {
                        "line_no": item.line_no,
                        "reason":
                            "inactive_service",
                    }
                )

                continue

            if item.package_id:
                if (
                    item.package.status
                    != "active"
                    or item.package.service.status
                    != "active"
                ):
                    unavailable_lines.append(
                        {
                            "line_no": item.line_no,
                            "reason":
                                "inactive_package_or_service",
                        }
                    )

        if unavailable_lines:
            return Response(
                {
                    "detail":
                        "Sale cannot be posted because one or more lines reference inactive catalog items.",
                    "lines":
                        unavailable_lines,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        posted = post_sale(
            sale.id,
            actor=request.user,
        )

        return Response(
            self.get_serializer(
                posted
            ).data,
            status=status.HTTP_200_OK,
        )


class SaleItemViewSet(TenantScopedModelViewSet):
    queryset = SaleItem.objects.select_related("sale", "service", "package").all()
    serializer_class = SaleItemSerializer
    permission_classes = [IsAuthenticated, *TenantScopedModelViewSet.permission_classes]
    permission_read = "sales.view"
    permission_write = "sales.manage"

    def perform_create(self, serializer):
        obj = serializer.save(tenant_id=self.request.tenant_id)
        obj.sale.recalculate_totals()
        AuditLog.objects.create(
            tenant_id=self.request.tenant_id,
            actor=self.request.user,
            action="sales.item.create",
            object_type=obj._meta.label_lower,
            object_id=obj.id,
            metadata={"sale_id": str(obj.sale_id), "line_no": obj.line_no},
        )

    def perform_update(self, serializer):
        if serializer.instance.sale.status != Sale.Status.DRAFT:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"sale": "Posted sale items are immutable."})
        obj = serializer.save()
        obj.sale.recalculate_totals()
        AuditLog.objects.create(
            tenant_id=self.request.tenant_id,
            actor=self.request.user,
            action="sales.item.update",
            object_type=obj._meta.label_lower,
            object_id=obj.id,
            metadata={"sale_id": str(obj.sale_id), "line_no": obj.line_no},
        )

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.sale.status != Sale.Status.DRAFT:
            return Response({"detail": "Posted sale items are immutable."}, status=405)
        sale = obj.sale
        object_id = obj.id
        line_no = obj.line_no
        with transaction.atomic():
            obj.delete()
            sale.recalculate_totals()
            AuditLog.objects.create(
                tenant_id=request.tenant_id,
                actor=request.user,
                action="sales.item.delete_draft",
                object_type="sales.saleitem",
                object_id=object_id,
                metadata={"sale_id": str(sale.id), "line_no": line_no},
            )
        return Response(status=status.HTTP_204_NO_CONTENT)
