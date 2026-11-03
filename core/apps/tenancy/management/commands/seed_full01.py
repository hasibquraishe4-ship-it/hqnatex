import os

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.agencies.models import Agency
from apps.branches.models import Branch
from apps.common.tenant import set_current_tenant
from apps.companies.models import Company
from apps.iam.models import MembershipRole, Permission, Role, RolePermission, TenantMembership, User
from apps.tenancy.models import Tenant


PERMISSIONS = [
    ("companies.view", "View companies"),
    ("companies.manage", "Manage companies"),
    ("branches.view", "View branches"),
    ("branches.manage", "Manage branches"),
    ("agencies.view", "View agencies"),
    ("agencies.manage", "Manage agencies"),
    ("iam.users.view", "View tenant users"),
    ("iam.users.manage", "Manage tenant users"),
    ("iam.roles.view", "View roles and permissions"),
    ("iam.roles.manage", "Manage roles and permissions"),
    ("settings.appearance.view", "View appearance and branding settings"),
    ("settings.appearance.manage", "Manage appearance and branding settings"),
    ("partners.view", "View partners"),
    ("partners.manage", "Manage partners"),
    ("finance.accounts.view", "View chart of accounts"),
    ("finance.accounts.manage", "Manage chart of accounts"),
    ("audit.view", "View audit logs"),
]


class Command(BaseCommand):
    help = "Seed FULL-01 with at least 20 isolated tenants/companies."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=20)

    def handle(self, *args, **options):
        count = options["count"]
        if count < 20:
            raise CommandError("FULL-01 requires at least 20 tenants/companies.")
        password = os.environ.get("HQNATEX_SEED_PASSWORD")
        if not password:
            raise CommandError("HQNATEX_SEED_PASSWORD is required.")

        permission_objects = []
        for key, name in PERMISSIONS:
            obj, _ = Permission.objects.update_or_create(key=key, defaults={"name": name})
            permission_objects.append(obj)

        platform_email = os.environ.get("HQNATEX_PLATFORM_ADMIN_EMAIL", "platform.admin@hqnatex.local")
        platform, created = User.objects.get_or_create(
            email=platform_email,
            defaults={"full_name": "HQNATEX Platform Admin", "status": User.Status.ACTIVE, "is_staff": True, "is_superuser": True},
        )
        if created or not platform.check_password(password):
            platform.is_staff = True
            platform.is_superuser = True
            platform.status = User.Status.ACTIVE
            platform.set_password(password)
            platform.save()

        for n in range(1, count + 1):
            code = f"ISP{n:03d}"
            tenant, _ = Tenant.objects.update_or_create(
                code=code,
                defaults={
                    "name": f"HQNATEX Test ISP {n:03d}",
                    "status": Tenant.Status.ACTIVE,
                    "timezone": "Asia/Kabul",
                    "default_language": "en",
                },
            )

            with transaction.atomic():
                set_current_tenant(tenant.id, local=True)
                company, _ = Company.objects.update_or_create(
                    tenant=tenant,
                    code=f"C{n:03d}",
                    defaults={
                        "legal_name": f"HQNATEX Test Company {n:03d}",
                        "trade_name": f"Test ISP {n:03d}",
                        "status": Company.Status.ACTIVE,
                        "is_primary": True,
                    },
                )
                branch, _ = Branch.objects.update_or_create(
                    tenant=tenant,
                    code="HQ",
                    defaults={"company": company, "name": "Head Office", "status": Branch.Status.ACTIVE},
                )
                Agency.objects.update_or_create(
                    tenant=tenant,
                    code="MAIN",
                    defaults={"company": company, "branch": branch, "name": "Main Agency", "status": Agency.Status.ACTIVE},
                )

                role, _ = Role.objects.update_or_create(
                    tenant=tenant,
                    key="tenant_admin",
                    defaults={"name": "Tenant Administrator", "status": Role.Status.ACTIVE, "is_system": True},
                )
                RolePermission.objects.filter(tenant=tenant, role=role).delete()
                RolePermission.objects.bulk_create(
                    [RolePermission(tenant=tenant, role=role, permission=p) for p in permission_objects]
                )

                email = f"tenant{n:03d}.admin@example.invalid"
                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={"full_name": f"Tenant {n:03d} Administrator", "status": User.Status.ACTIVE},
                )
                if created or not user.check_password(password):
                    user.status = User.Status.ACTIVE
                    user.set_password(password)
                    user.save()

                membership, _ = TenantMembership.objects.update_or_create(
                    tenant=tenant,
                    user=user,
                    defaults={"status": TenantMembership.Status.ACTIVE},
                )
                MembershipRole.objects.update_or_create(
                    tenant=tenant,
                    membership=membership,
                    role=role,
                )

        self.stdout.write(self.style.SUCCESS(f"FULL-01 seed complete: {count} tenants and {count} primary companies."))
        self.stdout.write(f"Platform admin: {platform_email}")
        self.stdout.write("Tenant admins: tenant001.admin@example.invalid ...")
