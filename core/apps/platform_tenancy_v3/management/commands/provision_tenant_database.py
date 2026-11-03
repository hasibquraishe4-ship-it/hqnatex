import os,re,psycopg
from psycopg import sql
from django.conf import settings
from django.core.management.base import BaseCommand,CommandError
from apps.tenancy.models import Tenant
from apps.platform_tenancy_v3.models import TenantDatabase
SAFE=re.compile(r"^[a-z][a-z0-9_]{0,62}$")
class Command(BaseCommand):
    help="Provision one tenant DB and verify a NOSUPERUSER/NOBYPASSRLS login role."
    def add_arguments(self,parser):
        parser.add_argument("tenant_id"); parser.add_argument("--db-alias",required=True); parser.add_argument("--db-name",required=True); parser.add_argument("--db-user",required=True); parser.add_argument("--password-env",required=True); parser.add_argument("--host"); parser.add_argument("--port",type=int)
    def handle(self,*args,**o):
        for key in ("db_alias","db_name","db_user"):
            if not SAFE.match(o[key]): raise CommandError("Unsafe %s"%key)
        password=os.environ.get(o["password_env"])
        if not password: raise CommandError("Missing environment variable: "+o["password_env"])
        tenant=Tenant.objects.get(pk=o["tenant_id"]); d=settings.DATABASES["default"]; host=o["host"] or d.get("HOST") or "127.0.0.1"; port=o["port"] or int(d.get("PORT") or 5432)
        admin_user=os.environ.get("HQNATEX_DB_ADMIN_USER") or os.environ.get("HQNATEX_PG_ADMIN_USER") or d.get("USER"); admin_password=os.environ.get("HQNATEX_DB_ADMIN_PASSWORD") or os.environ.get("HQNATEX_PG_ADMIN_PASSWORD") or d.get("PASSWORD"); maintenance=os.environ.get("HQNATEX_PG_MAINTENANCE_DB","postgres")
        if not admin_user: raise CommandError("No PostgreSQL admin user configured")
        conn=psycopg.connect(dbname=maintenance,host=host,port=port,user=admin_user,password=admin_password,autocommit=True)
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=%s",[o["db_user"]]); existing=cur.fetchone()
                if existing and (existing[0] or existing[1]): raise CommandError("Existing tenant DB role is SUPERUSER/BYPASSRLS")
                if existing:
                    cur.execute(
    sql.SQL("ALTER ROLE {} WITH LOGIN PASSWORD {} NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE").format(
        sql.Identifier(o["db_user"]),
        sql.Literal(password),
    )
)
                else:
                    cur.execute(
    sql.SQL("CREATE ROLE {} LOGIN PASSWORD {} NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE").format(
        sql.Identifier(o["db_user"]),
        sql.Literal(password),
    )
)
                cur.execute("SELECT 1 FROM pg_database WHERE datname=%s",[o["db_name"]])
                if not cur.fetchone(): cur.execute(sql.SQL("CREATE DATABASE {} OWNER {}").format(sql.Identifier(o["db_name"]),sql.Identifier(o["db_user"])))
        finally: conn.close()
        TenantDatabase.objects.update_or_create(tenant=tenant,defaults={"mode":"database","db_alias":o["db_alias"],"db_name":o["db_name"],"db_host":host,"db_port":port,"db_user":o["db_user"],"password_secret_ref":"env:"+o["password_env"],"status":"pending"}); self.stdout.write(self.style.SUCCESS("Tenant database provisioned and registered."))
