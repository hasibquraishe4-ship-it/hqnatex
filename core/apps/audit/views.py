from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.common.permissions import TenantContextPermission, TenantRBACPermission
from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, TenantContextPermission, TenantRBACPermission]
    permission_read = "audit.view"
    permission_write = None

    def permission_key_for_method(self, method):
        return self.permission_read

    def get_queryset(self):
        return AuditLog.objects.filter(tenant_id=self.request.tenant_id).select_related("actor")
