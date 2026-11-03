from apps.common.api import TenantScopedModelViewSet
from .models import Partner
from .serializers import PartnerSerializer


class PartnerViewSet(TenantScopedModelViewSet):
    queryset = Partner.objects.select_related("company")
    serializer_class = PartnerSerializer
    permission_read = "partners.view"
    permission_write = "partners.manage"
