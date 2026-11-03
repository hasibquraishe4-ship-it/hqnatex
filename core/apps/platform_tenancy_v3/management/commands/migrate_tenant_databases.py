from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.test.utils import override_settings
from django.utils import timezone
from apps.platform_tenancy_v3.models import TenantDatabase, TenantMigrationLedger
from apps.platform_tenancy_v3.runtime import register_database_alias
ROUTER="apps.platform_tenancy_v3.router.HQNATEXTenantDatabaseRouter"
class Command(BaseCommand):
    help="Migrate a tenant DB without installing the platform-only control-plane app."
    def add_arguments(self,parser):
        parser.add_argument("--tenant-id"); parser.add_argument("--database-alias")
    def handle(self,*args,**o):
        qs=TenantDatabase.objects.exclude(status="suspended").select_related("tenant")
        if o.get("tenant_id"): qs=qs.filter(tenant_id=o["tenant_id"])
        if o.get("database_alias"): qs=qs.filter(db_alias=o["database_alias"])
        for reg in qs:
            alias=register_database_alias(reg)
            led=TenantMigrationLedger.objects.create(tenant=reg.tenant,database_alias=alias,migration_label="django:migrate:tenant-schema",status="running",started_at=timezone.now())
            try:
                with override_settings(DATABASE_ROUTERS=[ROUTER]):
                    call_command("migrate",database=alias,interactive=False)
                reg.status="active"; reg.last_migrated_at=timezone.now(); reg.save(update_fields=["status","last_migrated_at","updated_at"])
                led.status="pass"; led.completed_at=timezone.now(); led.save(update_fields=["status","completed_at","updated_at"])
                self.stdout.write(self.style.SUCCESS(alias+": PASS"))
            except Exception as exc:
                reg.status="error"; reg.save(update_fields=["status","updated_at"])
                led.status="fail"; led.completed_at=timezone.now(); led.error_text=str(exc); led.save(update_fields=["status","completed_at","error_text","updated_at"])
                self.stderr.write(self.style.ERROR(alias+": FAIL: "+str(exc))); raise
