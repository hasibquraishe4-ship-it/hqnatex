from django.core.management.base import (
    BaseCommand,
)

from apps.hr.foundation_services import (
    ensure_hr_permissions,
)


class Command(BaseCommand):

    help = (
        "Create canonical HR/Payroll "
        "permissions and bind them "
        "to tenant_admin roles."
    )

    def handle(
        self,
        *args,
        **options,
    ):

        result = (
            ensure_hr_permissions()
        )

        for key, value in result.items():

            self.stdout.write(
                f"{key.upper()}={value}"
            )

        self.stdout.write(
            "HR_PERMISSION_SYNC=PASS"
        )
