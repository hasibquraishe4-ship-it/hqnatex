import json
from django.core.management.base import BaseCommand
from apps.platform_tenancy_v3.models import TenantDatabase
from apps.platform_tenancy_v3.runtime import register_database_alias
from apps.platform_tenancy_v3.rls import apply_scope_rls, database_role_security
class Command(BaseCommand):
    help="Apply tenant/company FORCE RLS inside one active tenant database."
    def add_arguments(self,parser): parser.add_argument("db_alias")
    def handle(self,*args,**o):
        reg=TenantDatabase.objects.get(db_alias=o["db_alias"],status="active"); alias=register_database_alias(reg); role=database_role_security(alias); rows=apply_scope_rls(alias)
        self.stdout.write(json.dumps({"database":alias,"role":role[0],"rolsuper":bool(role[1]),"rolbypassrls":bool(role[2]),"count":len(rows),"tables":rows},indent=2)); self.stdout.write(self.style.SUCCESS("Tenant/company FORCE RLS applied."))
