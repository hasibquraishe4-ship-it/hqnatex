from datetime import timedelta
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import TenantDatabase,PrivilegedAccessSession,TenantFeatureFlag,TenantStorageQuota
from .serializers import TenantDatabaseSerializer,PrivilegedAccessSessionSerializer,TenantFeatureFlagSerializer,TenantStorageQuotaSerializer
from .permissions import IsPlatformSuperAdmin
class PlatformBaseViewSet(viewsets.ModelViewSet): permission_classes=[IsPlatformSuperAdmin]
class TenantDatabaseViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes=[IsPlatformSuperAdmin]; queryset=TenantDatabase.objects.select_related("tenant").all().order_by("tenant_id"); serializer_class=TenantDatabaseSerializer
class TenantFeatureFlagViewSet(PlatformBaseViewSet): queryset=TenantFeatureFlag.objects.select_related("tenant").all().order_by("tenant_id","key"); serializer_class=TenantFeatureFlagSerializer
class TenantStorageQuotaViewSet(PlatformBaseViewSet): queryset=TenantStorageQuota.objects.select_related("tenant").all().order_by("tenant_id"); serializer_class=TenantStorageQuotaSerializer
class PrivilegedAccessSessionViewSet(PlatformBaseViewSet):
    queryset=PrivilegedAccessSession.objects.select_related("tenant","requested_by","approved_by").all().order_by("-created_at"); serializer_class=PrivilegedAccessSessionSerializer
    def perform_create(self,serializer): serializer.save(requested_by=self.request.user,status="pending")
    @action(detail=True,methods=["post"])
    def approve(self,request,pk=None):
        obj=self.get_object()
        if obj.status!="pending": return Response({"detail":"Only pending sessions can be approved."},status=409)
        minutes=int(request.data.get("minutes",30))
        if minutes<1 or minutes>240: return Response({"detail":"minutes must be between 1 and 240."},status=400)
        now=timezone.now(); obj.status="active"; obj.approved_by=request.user; obj.starts_at=now; obj.expires_at=now+timedelta(minutes=minutes); obj.save(update_fields=["status","approved_by","starts_at","expires_at","updated_at"]); return Response(self.get_serializer(obj).data)
    @action(detail=True,methods=["post"])
    def revoke(self,request,pk=None):
        obj=self.get_object(); obj.status="revoked"; obj.ended_at=timezone.now(); obj.save(update_fields=["status","ended_at","updated_at"]); return Response(self.get_serializer(obj).data)
