from __future__ import annotations

from rest_framework.permissions import BasePermission

from apps.common.tenant import (
    parse_company_id,
    parse_tenant_id,
    set_current_company,
    set_current_tenant,
)
from apps.companies.models import Company
from apps.iam.models import CompanyMembership, TenantMembership


class IsPlatformAdmin(BasePermission):
    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class TenantContextPermission(BasePermission):
    def has_permission(self, request, view) -> bool:
        tenant_id = parse_tenant_id(request.headers.get("X-Tenant-ID"))
        set_current_tenant(tenant_id, local=True)
        request.tenant_id = tenant_id

        membership = (
            TenantMembership.objects.select_related("tenant")
            .filter(tenant_id=tenant_id, user=request.user, status=TenantMembership.Status.ACTIVE)
            .first()
        )
        if request.user.is_superuser:
            request.tenant_membership = membership
            return True
        if membership is None:
            return False
        request.tenant_membership = membership
        return True


class TenantRBACPermission(BasePermission):
    def has_permission(self, request, view) -> bool:
        if request.user.is_superuser:
            return True
        membership = getattr(request, "tenant_membership", None)
        if membership is None:
            return False
        key = view.permission_key_for_method(request.method)
        if not key:
            return True
        return membership.membership_roles.filter(
            tenant_id=request.tenant_id,
            role__status="active",
            role__role_permissions__tenant_id=request.tenant_id,
            role__role_permissions__permission__key=key,
        ).exists()



class CompanyContextPermission(BasePermission):
    def has_permission(self, request, view) -> bool:
        company_id = parse_company_id(
            request.headers.get("X-Company-ID")
        )

        company = (
            Company.objects
            .filter(
                id=company_id,
                tenant_id=request.tenant_id,
                status=Company.Status.ACTIVE,
            )
            .first()
        )

        if company is None:
            return False

        membership = getattr(
            request,
            "tenant_membership",
            None,
        )

        if not request.user.is_superuser:
            if membership is None:
                return False

            allowed = CompanyMembership.objects.filter(
                tenant_id=request.tenant_id,
                membership=membership,
                company=company,
                status=CompanyMembership.Status.ACTIVE,
            ).exists()

            if not allowed:
                return False

        request.company = company
        request.company_id = company.id

        set_current_company(company.id, local=True)

        return True
