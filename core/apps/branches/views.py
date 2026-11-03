from rest_framework.permissions import IsAuthenticated

from apps.common.api import TenantScopedModelViewSet
from .models import Branch
from .serializers import BranchSerializer


class BranchViewSet(TenantScopedModelViewSet):
    queryset = Branch.objects.select_related("company").all()
    serializer_class = BranchSerializer
    permission_classes = [IsAuthenticated, *TenantScopedModelViewSet.permission_classes]
    permission_read = "branches.view"
    permission_write = "branches.manage"
