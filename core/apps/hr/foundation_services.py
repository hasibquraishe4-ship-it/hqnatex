from django.apps import apps
from django.db import transaction

from apps.platform_tenancy_v3.rls import (
    set_rls_context,
)


HR_PERMISSIONS = (
    (
        "hr.view",
        "View HR data",
    ),
    (
        "hr.manage",
        "Manage HR data",
    ),
    (
        "hr.self_service",
        "Use employee self service",
    ),
    (
        "payroll.view",
        "View payroll data",
    ),
    (
        "payroll.manage",
        "Manage payroll configuration",
    ),
    (
        "payroll.process",
        "Process and finalize payroll",
    ),
)


def ensure_hr_permissions():

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

    Tenant = apps.get_model(
        "tenancy",
        "Tenant",
    )

    permissions = []

    for key, name in HR_PERMISSIONS:

        permission, _ = (
            Permission.objects
            .update_or_create(
                key=key,
                defaults={
                    "name":
                        name
                },
            )
        )

        permissions.append(
            permission
        )

    tenant_ids = list(
        Tenant.objects
        .order_by("id")
        .values_list(
            "id",
            flat=True,
        )
    )

    roles_found = 0
    created = 0
    existing = 0
    failures = []

    for tenant_id in tenant_ids:

        with transaction.atomic():

            set_rls_context(
                "default",
                tenant_id,
                None,
            )

            role = (
                Role.objects
                .filter(
                    tenant_id=
                        tenant_id,
                    key=
                        "tenant_admin",
                )
                .first()
            )

            if role is None:

                failures.append(
                    f"{tenant_id}:NO_TENANT_ADMIN"
                )

                continue

            roles_found += 1

            for permission in permissions:

                _, was_created = (
                    RolePermission.objects
                    .get_or_create(
                        tenant_id=
                            tenant_id,
                        role=
                            role,
                        permission=
                            permission,
                    )
                )

                if was_created:
                    created += 1
                else:
                    existing += 1

    if failures:
        raise RuntimeError(
            "HR RBAC binding failures: "
            + "|".join(
                failures
            )
        )

    return {
        "permission_count":
            len(permissions),

        "tenant_count":
            len(tenant_ids),

        "tenant_admin_roles":
            roles_found,

        "bindings_created":
            created,

        "bindings_existing":
            existing,
    }
