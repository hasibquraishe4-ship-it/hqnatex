from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.common.api import TenantScopedModelViewSet
from apps.common.permissions import TenantContextPermission, TenantRBACPermission
from apps.companies.models import Company
from .models import CompanyMembership, Permission, Role, TenantMembership
from .serializers import (
    CompanyMembershipSerializer,
    MyCompanySerializer,
    PermissionSerializer,
    RoleSerializer,
    TenantMembershipSerializer,
)


class RoleViewSet(TenantScopedModelViewSet):
    queryset = Role.objects.prefetch_related("permissions").all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated, *TenantScopedModelViewSet.permission_classes]
    permission_read = "iam.roles.view"
    permission_write = "iam.roles.manage"


class TenantMembershipViewSet(TenantScopedModelViewSet):
    queryset = TenantMembership.objects.select_related("user").all()
    serializer_class = TenantMembershipSerializer
    permission_classes = [IsAuthenticated, *TenantScopedModelViewSet.permission_classes]
    permission_read = "iam.users.view"
    permission_write = "iam.users.manage"


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [IsAuthenticated, TenantContextPermission, TenantRBACPermission]
    permission_read = "iam.roles.view"
    permission_write = None

    def permission_key_for_method(self, method):
        return self.permission_read



class CompanyMembershipViewSet(TenantScopedModelViewSet):
    queryset = CompanyMembership.objects.select_related(
        "membership",
        "membership__user",
        "company",
    ).all()
    serializer_class = CompanyMembershipSerializer
    permission_classes = [
        IsAuthenticated,
        *TenantScopedModelViewSet.permission_classes,
    ]
    permission_read = "iam.users.view"
    permission_write = "iam.users.manage"


class MyCompanyViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MyCompanySerializer
    permission_classes = [
        IsAuthenticated,
        TenantContextPermission,
    ]

    def _active_grants(self):
        membership = getattr(
            self.request,
            "tenant_membership",
            None,
        )
        if membership is None:
            return CompanyMembership.objects.none()

        return CompanyMembership.objects.filter(
            tenant_id=self.request.tenant_id,
            membership=membership,
            status=CompanyMembership.Status.ACTIVE,
            company__status=Company.Status.ACTIVE,
        )

    def get_queryset(self):
        tenant_id = self.request.tenant_id

        if self.request.user.is_superuser:
            return Company.objects.filter(
                tenant_id=tenant_id,
                status=Company.Status.ACTIVE,
            ).order_by("-is_primary", "legal_name")

        company_ids = self._active_grants().values_list(
            "company_id",
            flat=True,
        )

        return Company.objects.filter(
            tenant_id=tenant_id,
            id__in=company_ids,
            status=Company.Status.ACTIVE,
        ).order_by("legal_name")

    def get_serializer_context(self):
        context = super().get_serializer_context()

        if self.request.user.is_superuser:
            context["default_company_ids"] = set()
        else:
            context["default_company_ids"] = set(
                self._active_grants()
                .filter(is_default=True)
                .values_list("company_id", flat=True)
            )

        return context
