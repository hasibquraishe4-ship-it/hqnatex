from .views import TenantDatabaseViewSet, PrivilegedAccessSessionViewSet, TenantFeatureFlagViewSet, TenantStorageQuotaViewSet

def register(router):
    router.register(r"platform/tenant-databases", TenantDatabaseViewSet, basename="platform-tenant-databases")
    router.register(r"platform/privileged-access", PrivilegedAccessSessionViewSet, basename="platform-privileged-access")
    router.register(r"platform/feature-flags", TenantFeatureFlagViewSet, basename="platform-feature-flags")
    router.register(r"platform/storage-quotas", TenantStorageQuotaViewSet, basename="platform-storage-quotas")
