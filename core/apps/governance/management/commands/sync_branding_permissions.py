from django.core.management.base import BaseCommand

from apps.iam.models import Permission

from apps.governance.branding_service import (
    BACKGROUND_PERMISSION_MANAGE,
    BACKGROUND_PERMISSION_VIEW,
)


PERMISSIONS = (
    (
        BACKGROUND_PERMISSION_VIEW,
        "View appearance and branding settings",
    ),
    (
        BACKGROUND_PERMISSION_MANAGE,
        "Manage appearance and branding settings",
    ),
)


class Command(BaseCommand):
    help = (
        "Idempotently create/update canonical "
        "appearance/branding permission definitions. "
        "This command does not grant permissions to roles."
    )

    def handle(
        self,
        *args,
        **options,
    ):

        created_count = 0
        updated_count = 0

        for key, name in PERMISSIONS:

            permission, created = (
                Permission.objects
                .update_or_create(
                    key=key,
                    defaults={
                        "name": name,
                        "description": (
                            "HQNATEX appearance "
                            "and branding permission"
                        ),
                    },
                )
            )

            if created:
                created_count += 1
            else:
                updated_count += 1

            self.stdout.write(
                f"PERMISSION={permission.key}"
                f"|CREATED={str(created).lower()}"
            )

        self.stdout.write(
            self.style.SUCCESS(
                "BRANDING_PERMISSION_SYNC=PASS"
                f"|CREATED={created_count}"
                f"|UPDATED={updated_count}"
            )
        )
