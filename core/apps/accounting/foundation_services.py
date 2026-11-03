from __future__ import annotations

from dataclasses import dataclass

from django.apps import apps
from django.db import transaction
from apps.platform_tenancy_v3.rls import set_rls_context


ACCOUNTING_FOUNDATION_PERMISSIONS = (
    ("accounting.periods.view", "View accounting periods"),
    ("accounting.periods.manage", "Manage accounting periods"),
    ("accounting.journals.view", "View accounting journals"),
    ("accounting.journals.manage", "Manage accounting journals"),
    ("accounting.journals.post", "Post accounting journals"),
    ("finance.accounts.view", "View finance accounts"),
    ("finance.accounts.manage", "Manage finance accounts"),
    ("accounting.ledger.view", "View general ledger"),
)

JOURNAL_SERIES_KEY = "journal"


@dataclass(frozen=True)
class PermissionBootstrapResult:
    permission_count: int
    tenant_admin_role_count: int
    binding_count: int


@transaction.atomic
def ensure_accounting_permissions() -> PermissionBootstrapResult:
    """
    Idempotently create/update technical permission keys and bind them to all
    existing tenant_admin roles. This function does not assume a tenant count.
    """
    Permission = apps.get_model(
        "iam",
        "Permission",
    )
    Role = apps.get_model(
        "iam",
        "Role",
    )
    RolePermission = apps.get_model(
        "iam",
        "RolePermission",
    )

    permission_objects = []

    for key, name in ACCOUNTING_FOUNDATION_PERMISSIONS:
        permission, _created = Permission.objects.update_or_create(
            key=key,
            defaults={
                "name": name,
            },
        )
        permission_objects.append(
            permission
        )

    Tenant = apps.get_model(
        "tenancy",
        "Tenant",
    )

    # HQNATEX_ACCOUNTING_PERMISSION_BOOTSTRAP_TENANT_RLS_CONTEXT_V1
    #
    # iam_roles and iam_role_permissions are protected by tenant RLS.
    # Permissions are global, so create/update them once above, then switch
    # transaction-local RLS context for each tenant before reading roles or
    # creating role-permission bindings.
    tenant_ids = list(
        Tenant.objects
        .order_by("id")
        .values_list(
            "id",
            flat=True,
        )
    )

    tenant_admin_role_count = 0
    binding_count = 0

    for tenant_id in tenant_ids:
        set_rls_context(
            "default",
            tenant_id,
            None,
        )

        roles = list(
            Role.objects.filter(
                tenant_id=tenant_id,
                key="tenant_admin",
            )
        )

        tenant_admin_role_count += len(
            roles
        )

        for role in roles:
            for permission in permission_objects:
                RolePermission.objects.get_or_create(
                    tenant_id=tenant_id,
                    role=role,
                    permission=permission,
                )
                binding_count += 1

    return PermissionBootstrapResult(
        permission_count=len(permission_objects),
        tenant_admin_role_count=tenant_admin_role_count,
        binding_count=binding_count,
    )


@transaction.atomic
def configure_company_journal_numbering(
    *,
    tenant_id,
    company_id,
    prefix,
    padding,
    reset_policy,
    is_active=True,
):
    """
    Create or update the journal numbering configuration using caller-supplied
    configuration. No business prefix or numbering policy is embedded here.
    """
    Series = apps.get_model(
        "governance",
        "NumberingSeries",
    )

    if prefix is None:
        prefix = ""

    padding = int(padding)

    if padding < 1 or padding > 20:
        raise ValueError(
            "padding must be between 1 and 20"
        )

    # HQNATEX_ACCOUNTING_NUMBERING_RLS_TRANSACTION_CONTEXT_V1
    set_rls_context(
        "default",
        tenant_id,
        company_id,
    )

    series, _created = Series.objects.update_or_create(
        tenant_id=tenant_id,
        company_id=company_id,
        series_key=JOURNAL_SERIES_KEY,
        defaults={
            "prefix": prefix,
            "padding": padding,
            "reset_policy": reset_policy,
            "is_active": bool(is_active),
        },
    )

    return series
