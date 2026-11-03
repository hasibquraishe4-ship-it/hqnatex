from __future__ import annotations

from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.audit.models import AuditLog
from apps.common.permissions import (
    CompanyContextPermission,
    TenantContextPermission,
    TenantRBACPermission,
)


class TenantScopedModelViewSet(viewsets.ModelViewSet):
    permission_classes = [TenantContextPermission, TenantRBACPermission]
    permission_read: str | None = None
    permission_write: str | None = None
    tenant_field = "tenant_id"

    def permission_key_for_method(self, method: str) -> str | None:
        return self.permission_read if method in {"GET", "HEAD", "OPTIONS"} else self.permission_write

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.filter(**{self.tenant_field: self.request.tenant_id})

    def perform_create(self, serializer):
        obj = serializer.save(tenant_id=self.request.tenant_id)
        AuditLog.objects.create(
            tenant_id=self.request.tenant_id,
            actor=self.request.user,
            action="create",
            object_type=obj._meta.label_lower,
            object_id=obj.pk,
            metadata={"api": True},
        )

    def perform_update(self, serializer):
        obj = serializer.save()
        AuditLog.objects.create(
            tenant_id=self.request.tenant_id,
            actor=self.request.user,
            action="update",
            object_type=obj._meta.label_lower,
            object_id=obj.pk,
            metadata={"api": True},
        )

    def destroy(self, request, *args, **kwargs):
        return Response(
            {"detail": "Hard delete is disabled. Change status instead."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )



class CompanyScopedModelViewSet(TenantScopedModelViewSet):
    permission_classes = [
        IsAuthenticated,
        TenantContextPermission,
        CompanyContextPermission,
        TenantRBACPermission,
    ]

    company_field = "company_id"

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.filter(
            **{self.company_field: self.request.company_id}
        )

    def perform_create(self, serializer):
        obj = serializer.save(
            tenant_id=self.request.tenant_id,
            company_id=self.request.company_id,
        )
        AuditLog.objects.create(
            tenant_id=self.request.tenant_id,
            actor=self.request.user,
            action="create",
            object_type=obj._meta.label_lower,
            object_id=obj.pk,
            metadata={
                "api": True,
                "company_id": str(self.request.company_id),
            },
        )

    def perform_update(self, serializer):
        obj = serializer.save(
            company_id=self.request.company_id,
        )
        AuditLog.objects.create(
            tenant_id=self.request.tenant_id,
            actor=self.request.user,
            action="update",
            object_type=obj._meta.label_lower,
            object_id=obj.pk,
            metadata={
                "api": True,
                "company_id": str(self.request.company_id),
            },
        )



class CompanyScopedReadOnlyModelViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [
        IsAuthenticated,
        TenantContextPermission,
        CompanyContextPermission,
        TenantRBACPermission,
    ]

    permission_read: str | None = None
    tenant_field = "tenant_id"
    company_field = "company_id"

    def permission_key_for_method(self, method: str) -> str | None:
        return self.permission_read

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.filter(
            **{
                self.tenant_field: self.request.tenant_id,
                self.company_field: self.request.company_id,
            }
        )
