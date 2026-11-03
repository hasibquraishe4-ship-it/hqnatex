from rest_framework.permissions import IsAuthenticated

from apps.common.api import TenantScopedModelViewSet
from .models import Company
from .serializers import CompanySerializer


class CompanyViewSet(TenantScopedModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated, *TenantScopedModelViewSet.permission_classes]
    permission_read = "companies.view"
    permission_write = "companies.manage"
