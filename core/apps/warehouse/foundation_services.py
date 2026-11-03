from dataclasses import dataclass

from apps.iam.models import Permission


WAREHOUSE_PERMISSIONS = (
    (
        "warehouse.view",
        "View warehouse and procurement",
    ),
    (
        "warehouse.manage",
        "Manage warehouse and procurement",
    ),
)


@dataclass(frozen=True)
class PermissionBootstrapResult:
    created: int
    existing: int


def ensure_warehouse_permissions() -> PermissionBootstrapResult:
    created_count = 0
    existing_count = 0

    for key, name in WAREHOUSE_PERMISSIONS:
        _permission, created = Permission.objects.update_or_create(
            key=key,
            defaults={
                "name": name,
            },
        )

        if created:
            created_count += 1
        else:
            existing_count += 1

    return PermissionBootstrapResult(
        created=created_count,
        existing=existing_count,
    )
