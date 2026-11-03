from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.audit.models import AuditLog
from apps.common.permissions import IsPlatformAdmin
from apps.common.tenant import set_current_tenant
from .models import Tenant
from .serializers import TenantSerializer


class TenantViewSet(viewsets.ModelViewSet):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def perform_create(self, serializer):
        obj = serializer.save()
        set_current_tenant(obj.id, local=True)
        AuditLog.objects.create(
            tenant=obj,
            actor=self.request.user,
            action="platform.tenant.create",
            object_type=obj._meta.label_lower,
            object_id=obj.id,
            metadata={"api": True},
        )

    def perform_update(self, serializer):
        obj = serializer.save()
        set_current_tenant(obj.id, local=True)
        AuditLog.objects.create(
            tenant=obj,
            actor=self.request.user,
            action="platform.tenant.update",
            object_type=obj._meta.label_lower,
            object_id=obj.id,
            metadata={"api": True},
        )

    def destroy(self, request, *args, **kwargs):
        return Response(
            {"detail": "Hard delete is disabled. Change tenant status instead."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )
