from rest_framework.permissions import IsAuthenticated

from apps.common.api import TenantScopedModelViewSet
from .models import Agency
from .serializers import AgencySerializer


class AgencyViewSet(TenantScopedModelViewSet):
    queryset = Agency.objects.select_related("company", "branch").all()
    serializer_class = AgencySerializer
    permission_classes = [IsAuthenticated, *TenantScopedModelViewSet.permission_classes]
    permission_read = "agencies.view"
    permission_write = "agencies.manage"
