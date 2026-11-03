#!/usr/bin/env python3
from __future__ import annotations
import argparse, datetime as dt, hashlib, json, os, re, shutil, subprocess, sys, tarfile
from pathlib import Path
VERSION="3.1.0"
APP="platform_tenancy_v3"
MODELS_PY='from django.conf import settings\nfrom django.db import models\nfrom apps.common.models import UUIDTimestampModel\nfrom apps.tenancy.models import Tenant\n\nclass TenantDatabase(UUIDTimestampModel):\n    MODE_CHOICES = [\n        ("shared", "Shared Pool"),\n        ("database", "Database Per Tenant"),\n        ("dedicated", "Dedicated Cluster"),\n    ]\n    tenant = models.OneToOneField(Tenant, on_delete=models.PROTECT, related_name="database_registry")\n    mode = models.CharField(max_length=24, choices=MODE_CHOICES, default="database")\n    db_alias = models.SlugField(max_length=80, unique=True)\n    db_name = models.CharField(max_length=120, unique=True)\n    db_host = models.CharField(max_length=255)\n    db_port = models.PositiveIntegerField(default=5432)\n    db_user = models.CharField(max_length=120)\n    password_secret_ref = models.CharField(max_length=255)\n    status = models.CharField(max_length=24, default="pending", db_index=True)\n    schema_version = models.CharField(max_length=64, blank=True)\n    last_migrated_at = models.DateTimeField(null=True, blank=True)\n    last_backup_at = models.DateTimeField(null=True, blank=True)\n\n    class Meta:\n        db_table = "platform_tenant_databases"\n\nclass PrivilegedAccessSession(UUIDTimestampModel):\n    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="privileged_access_sessions")\n    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="requested_privileged_sessions")\n    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="approved_privileged_sessions", null=True, blank=True)\n    reason = models.TextField()\n    status = models.CharField(max_length=24, default="pending", db_index=True)\n    starts_at = models.DateTimeField(null=True, blank=True)\n    expires_at = models.DateTimeField(null=True, blank=True)\n    ended_at = models.DateTimeField(null=True, blank=True)\n    source_ip = models.GenericIPAddressField(null=True, blank=True)\n\n    class Meta:\n        db_table = "platform_privileged_access_sessions"\n\nclass TenantFeatureFlag(UUIDTimestampModel):\n    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="platform_feature_flags")\n    key = models.CharField(max_length=120)\n    enabled = models.BooleanField(default=False)\n    config = models.JSONField(default=dict, blank=True)\n\n    class Meta:\n        db_table = "platform_tenant_feature_flags"\n        constraints = [\n            models.UniqueConstraint(fields=["tenant", "key"], name="uq_platform_tenant_feature_key")\n        ]\n\nclass TenantStorageQuota(UUIDTimestampModel):\n    tenant = models.OneToOneField(Tenant, on_delete=models.PROTECT, related_name="storage_quota")\n    max_bytes = models.BigIntegerField(default=0)\n    used_bytes = models.BigIntegerField(default=0)\n    max_files = models.BigIntegerField(default=0)\n    used_files = models.BigIntegerField(default=0)\n\n    class Meta:\n        db_table = "platform_tenant_storage_quotas"\n\nclass TenantMigrationLedger(UUIDTimestampModel):\n    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="migration_ledger")\n    database_alias = models.CharField(max_length=80)\n    migration_label = models.CharField(max_length=255)\n    status = models.CharField(max_length=24, db_index=True)\n    started_at = models.DateTimeField()\n    completed_at = models.DateTimeField(null=True, blank=True)\n    checksum = models.CharField(max_length=128, blank=True)\n    error_text = models.TextField(blank=True)\n\n    class Meta:\n        db_table = "platform_tenant_migration_ledger"\n'
RUNTIME_PY='import contextvars\nimport os\nimport re\nfrom copy import deepcopy\nfrom django.conf import settings\nfrom django.db import connections\n\n_current_db_alias = contextvars.ContextVar("hqnatex_current_db_alias", default="default")\n_current_tenant_id = contextvars.ContextVar("hqnatex_current_tenant_id", default=None)\n_current_company_id = contextvars.ContextVar("hqnatex_current_company_id", default=None)\n_SAFE_ALIAS = re.compile(r"^[a-z][a-z0-9_]{0,62}$")\n\ndef current_database_alias():\n    return _current_db_alias.get()\n\ndef current_tenant_id():\n    return _current_tenant_id.get()\n\ndef current_company_id():\n    return _current_company_id.get()\n\ndef secret_from_ref(secret_ref):\n    if not secret_ref.startswith("env:"):\n        raise RuntimeError("Only env: secret references are enabled.")\n    key = secret_ref[4:]\n    value = os.environ.get(key)\n    if not value:\n        raise RuntimeError("Required secret environment variable is not set: " + key)\n    return value\n\ndef register_database_alias(registry):\n    alias = registry.db_alias\n    if not _SAFE_ALIAS.match(alias):\n        raise RuntimeError("Unsafe database alias.")\n    if alias in connections.databases:\n        return alias\n    base = deepcopy(settings.DATABASES["default"])\n    base.update({\n        "NAME": registry.db_name,\n        "HOST": registry.db_host,\n        "PORT": str(registry.db_port),\n        "USER": registry.db_user,\n        "PASSWORD": secret_from_ref(registry.password_secret_ref),\n    })\n    connections.databases[alias] = base\n    return alias\n\nclass tenant_database_context:\n    def __init__(self, registry, company_id=None):\n        self.registry = registry\n        self.company_id = company_id\n        self.tokens = []\n\n    def __enter__(self):\n        alias = register_database_alias(self.registry)\n        self.tokens = [\n            (_current_db_alias, _current_db_alias.set(alias)),\n            (_current_tenant_id, _current_tenant_id.set(str(self.registry.tenant_id))),\n            (_current_company_id, _current_company_id.set(str(self.company_id) if self.company_id else None)),\n        ]\n        return alias\n\n    def __exit__(self, exc_type, exc, tb):\n        for var, token in reversed(self.tokens):\n            var.reset(token)\n\ndef scoped_cache_key(key, tenant_id=None, company_id=None):\n    tenant = str(tenant_id or current_tenant_id() or "")\n    company = str(company_id or current_company_id() or "")\n    if not tenant:\n        raise RuntimeError("Tenant context is required for business cache keys.")\n    return "tenant:%s:company:%s:%s" % (tenant, company or "-", key)\n\ndef scoped_storage_path(path, tenant_id=None, company_id=None):\n    tenant = str(tenant_id or current_tenant_id() or "")\n    company = str(company_id or current_company_id() or "")\n    if not tenant:\n        raise RuntimeError("Tenant context is required for business file paths.")\n    clean = path.lstrip("/").replace("..", "_")\n    return "tenants/%s/companies/%s/%s" % (tenant, company or "-", clean)\n'
ROUTER_PY='from .runtime import current_database_alias\n\nPLATFORM_ONLY_APPS = {"platform_tenancy_v3"}\n\nclass HQNATEXTenantDatabaseRouter:\n    def db_for_read(self, model, **hints):\n        if model._meta.app_label in PLATFORM_ONLY_APPS:\n            return "default"\n        return current_database_alias()\n\n    def db_for_write(self, model, **hints):\n        if model._meta.app_label in PLATFORM_ONLY_APPS:\n            return "default"\n        return current_database_alias()\n\n    def allow_relation(self, obj1, obj2, **hints):\n        db1=getattr(obj1._state,"db",None); db2=getattr(obj2._state,"db",None)\n        if db1 and db2: return db1==db2\n        return None\n\n    def allow_migrate(self, db, app_label, model_name=None, **hints):\n        if db=="default": return True\n        if app_label in PLATFORM_ONLY_APPS: return False\n        return True\n'
RLS_PY='from django.db import connections, transaction\n\ndef set_rls_context(database_alias, tenant_id, company_id=None):\n    conn=connections[database_alias]\n    with conn.cursor() as cur:\n        cur.execute("SELECT set_config(\'app.current_tenant_id\', %s, true)",[str(tenant_id)])\n        cur.execute("SELECT set_config(\'app.current_company_id\', %s, true)",[str(company_id or "")])\n\ndef scoped_table_metadata(database_alias):\n    conn=connections[database_alias]\n    with conn.cursor() as cur:\n        cur.execute("""SELECT table_name, MAX(CASE WHEN column_name=\'tenant_id\' THEN 1 ELSE 0 END), MAX(CASE WHEN column_name=\'company_id\' THEN 1 ELSE 0 END), MAX(CASE WHEN column_name=\'company_id\' AND is_nullable=\'YES\' THEN 1 ELSE 0 END) FROM information_schema.columns WHERE table_schema=\'public\' AND column_name IN (\'tenant_id\',\'company_id\') GROUP BY table_name ORDER BY table_name""")\n        return [{"table":r[0],"has_tenant":bool(r[1]),"has_company":bool(r[2]),"company_nullable":bool(r[3])} for r in cur.fetchall()]\n\ndef database_role_security(database_alias):\n    conn=connections[database_alias]\n    with conn.cursor() as cur:\n        cur.execute("SELECT current_user, rolsuper, rolbypassrls FROM pg_roles WHERE rolname=current_user"); return cur.fetchone()\n\ndef apply_scope_rls(database_alias):\n    role=database_role_security(database_alias)\n    if not role: raise RuntimeError("Could not inspect tenant database role")\n    if role[1] or role[2]: raise RuntimeError("Refusing RLS: tenant application role is SUPERUSER/BYPASSRLS")\n    conn=connections[database_alias]; meta=scoped_table_metadata(database_alias); applied=[]\n    with transaction.atomic(using=database_alias):\n        with conn.cursor() as cur:\n            for item in meta:\n                table=item["table"]\n                if not table.replace("_","").isalnum(): raise RuntimeError("Unsafe table name: "+table)\n                clauses=[]\n                if item["has_tenant"]: clauses.append("tenant_id::text = current_setting(\'app.current_tenant_id\', true)")\n                if item["has_company"]:\n                    cm="company_id::text = current_setting(\'app.current_company_id\', true)"\n                    clauses.append("("+cm+" OR company_id IS NULL)" if item["company_nullable"] else cm)\n                cond=" AND ".join(clauses)\n                policy=table+"_scope_isolation"; qt=conn.ops.quote_name(table); qp=conn.ops.quote_name(policy)\n                cur.execute("ALTER TABLE %s ENABLE ROW LEVEL SECURITY"%qt); cur.execute("ALTER TABLE %s FORCE ROW LEVEL SECURITY"%qt)\n                cur.execute("DROP POLICY IF EXISTS %s ON %s"%(qp,qt)); cur.execute("CREATE POLICY %s ON %s USING (%s) WITH CHECK (%s)"%(qp,qt,cond,cond))\n                applied.append(item)\n    return applied\n'
PERMISSIONS_PY='from rest_framework.permissions import BasePermission\n\nclass IsPlatformSuperAdmin(BasePermission):\n    def has_permission(self, request, view):\n        user = getattr(request, "user", None)\n        return bool(user and user.is_authenticated and getattr(user, "is_superuser", False))\n'
SERIALIZERS_PY='from rest_framework import serializers\nfrom .models import TenantDatabase, PrivilegedAccessSession, TenantFeatureFlag, TenantStorageQuota\n\nclass TenantDatabaseSerializer(serializers.ModelSerializer):\n    class Meta:\n        model = TenantDatabase\n        exclude = ("password_secret_ref",)\n\nclass PrivilegedAccessSessionSerializer(serializers.ModelSerializer):\n    class Meta:\n        model = PrivilegedAccessSession\n        fields = "__all__"\n        read_only_fields = ("requested_by", "approved_by", "status", "starts_at", "ended_at")\n\nclass TenantFeatureFlagSerializer(serializers.ModelSerializer):\n    class Meta:\n        model = TenantFeatureFlag\n        fields = "__all__"\n\nclass TenantStorageQuotaSerializer(serializers.ModelSerializer):\n    class Meta:\n        model = TenantStorageQuota\n        fields = "__all__"\n'
VIEWS_PY='from datetime import timedelta\nfrom django.utils import timezone\nfrom rest_framework import viewsets\nfrom rest_framework.decorators import action\nfrom rest_framework.response import Response\nfrom .models import TenantDatabase,PrivilegedAccessSession,TenantFeatureFlag,TenantStorageQuota\nfrom .serializers import TenantDatabaseSerializer,PrivilegedAccessSessionSerializer,TenantFeatureFlagSerializer,TenantStorageQuotaSerializer\nfrom .permissions import IsPlatformSuperAdmin\nclass PlatformBaseViewSet(viewsets.ModelViewSet): permission_classes=[IsPlatformSuperAdmin]\nclass TenantDatabaseViewSet(viewsets.ReadOnlyModelViewSet):\n    permission_classes=[IsPlatformSuperAdmin]; queryset=TenantDatabase.objects.select_related("tenant").all().order_by("tenant_id"); serializer_class=TenantDatabaseSerializer\nclass TenantFeatureFlagViewSet(PlatformBaseViewSet): queryset=TenantFeatureFlag.objects.select_related("tenant").all().order_by("tenant_id","key"); serializer_class=TenantFeatureFlagSerializer\nclass TenantStorageQuotaViewSet(PlatformBaseViewSet): queryset=TenantStorageQuota.objects.select_related("tenant").all().order_by("tenant_id"); serializer_class=TenantStorageQuotaSerializer\nclass PrivilegedAccessSessionViewSet(PlatformBaseViewSet):\n    queryset=PrivilegedAccessSession.objects.select_related("tenant","requested_by","approved_by").all().order_by("-created_at"); serializer_class=PrivilegedAccessSessionSerializer\n    def perform_create(self,serializer): serializer.save(requested_by=self.request.user,status="pending")\n    @action(detail=True,methods=["post"])\n    def approve(self,request,pk=None):\n        obj=self.get_object()\n        if obj.status!="pending": return Response({"detail":"Only pending sessions can be approved."},status=409)\n        minutes=int(request.data.get("minutes",30))\n        if minutes<1 or minutes>240: return Response({"detail":"minutes must be between 1 and 240."},status=400)\n        now=timezone.now(); obj.status="active"; obj.approved_by=request.user; obj.starts_at=now; obj.expires_at=now+timedelta(minutes=minutes); obj.save(update_fields=["status","approved_by","starts_at","expires_at","updated_at"]); return Response(self.get_serializer(obj).data)\n    @action(detail=True,methods=["post"])\n    def revoke(self,request,pk=None):\n        obj=self.get_object(); obj.status="revoked"; obj.ended_at=timezone.now(); obj.save(update_fields=["status","ended_at","updated_at"]); return Response(self.get_serializer(obj).data)\n'
API_PY='from .views import TenantDatabaseViewSet, PrivilegedAccessSessionViewSet, TenantFeatureFlagViewSet, TenantStorageQuotaViewSet\n\ndef register(router):\n    router.register(r"platform/tenant-databases", TenantDatabaseViewSet, basename="platform-tenant-databases")\n    router.register(r"platform/privileged-access", PrivilegedAccessSessionViewSet, basename="platform-privileged-access")\n    router.register(r"platform/feature-flags", TenantFeatureFlagViewSet, basename="platform-feature-flags")\n    router.register(r"platform/storage-quotas", TenantStorageQuotaViewSet, basename="platform-storage-quotas")\n'
APPS_PY='from django.apps import AppConfig\n\nclass PlatformTenancyV3Config(AppConfig):\n    default_auto_field = "django.db.models.BigAutoField"\n    name = "apps.platform_tenancy_v3"\n'
PROVISION_CMD='import os,re,psycopg\nfrom psycopg import sql\nfrom django.conf import settings\nfrom django.core.management.base import BaseCommand,CommandError\nfrom apps.tenancy.models import Tenant\nfrom apps.platform_tenancy_v3.models import TenantDatabase\nSAFE=re.compile(r"^[a-z][a-z0-9_]{0,62}$")\nclass Command(BaseCommand):\n    help="Provision one tenant DB and verify a NOSUPERUSER/NOBYPASSRLS login role."\n    def add_arguments(self,parser):\n        parser.add_argument("tenant_id"); parser.add_argument("--db-alias",required=True); parser.add_argument("--db-name",required=True); parser.add_argument("--db-user",required=True); parser.add_argument("--password-env",required=True); parser.add_argument("--host"); parser.add_argument("--port",type=int)\n    def handle(self,*args,**o):\n        for key in ("db_alias","db_name","db_user"):\n            if not SAFE.match(o[key]): raise CommandError("Unsafe %s"%key)\n        password=os.environ.get(o["password_env"])\n        if not password: raise CommandError("Missing environment variable: "+o["password_env"])\n        tenant=Tenant.objects.get(pk=o["tenant_id"]); d=settings.DATABASES["default"]; host=o["host"] or d.get("HOST") or "127.0.0.1"; port=o["port"] or int(d.get("PORT") or 5432)\n        admin_user=os.environ.get("HQNATEX_PG_ADMIN_USER") or d.get("USER"); admin_password=os.environ.get("HQNATEX_PG_ADMIN_PASSWORD") or d.get("PASSWORD"); maintenance=os.environ.get("HQNATEX_PG_MAINTENANCE_DB","postgres")\n        if not admin_user: raise CommandError("No PostgreSQL admin user configured")\n        conn=psycopg.connect(dbname=maintenance,host=host,port=port,user=admin_user,password=admin_password,autocommit=True)\n        try:\n            with conn.cursor() as cur:\n                cur.execute("SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=%s",[o["db_user"]]); existing=cur.fetchone()\n                if existing and (existing[0] or existing[1]): raise CommandError("Existing tenant DB role is SUPERUSER/BYPASSRLS")\n                if existing:\n                    cur.execute(sql.SQL("ALTER ROLE {} NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE").format(sql.Identifier(o["db_user"])))\n                else:\n                    cur.execute(sql.SQL("CREATE ROLE {} LOGIN PASSWORD %s NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE").format(sql.Identifier(o["db_user"])),[password])\n                cur.execute("SELECT 1 FROM pg_database WHERE datname=%s",[o["db_name"]])\n                if not cur.fetchone(): cur.execute(sql.SQL("CREATE DATABASE {} OWNER {}").format(sql.Identifier(o["db_name"]),sql.Identifier(o["db_user"])))\n        finally: conn.close()\n        TenantDatabase.objects.update_or_create(tenant=tenant,defaults={"mode":"database","db_alias":o["db_alias"],"db_name":o["db_name"],"db_host":host,"db_port":port,"db_user":o["db_user"],"password_secret_ref":"env:"+o["password_env"],"status":"pending"}); self.stdout.write(self.style.SUCCESS("Tenant database provisioned and registered."))\n'
MIGRATE_CMD='from django.core.management import call_command\nfrom django.core.management.base import BaseCommand\nfrom django.test.utils import override_settings\nfrom django.utils import timezone\nfrom apps.platform_tenancy_v3.models import TenantDatabase, TenantMigrationLedger\nfrom apps.platform_tenancy_v3.runtime import register_database_alias\nROUTER="apps.platform_tenancy_v3.router.HQNATEXTenantDatabaseRouter"\nclass Command(BaseCommand):\n    help="Migrate a tenant DB without installing the platform-only control-plane app."\n    def add_arguments(self,parser):\n        parser.add_argument("--tenant-id"); parser.add_argument("--database-alias")\n    def handle(self,*args,**o):\n        qs=TenantDatabase.objects.exclude(status="suspended").select_related("tenant")\n        if o.get("tenant_id"): qs=qs.filter(tenant_id=o["tenant_id"])\n        if o.get("database_alias"): qs=qs.filter(db_alias=o["database_alias"])\n        for reg in qs:\n            alias=register_database_alias(reg)\n            led=TenantMigrationLedger.objects.create(tenant=reg.tenant,database_alias=alias,migration_label="django:migrate:tenant-schema",status="running",started_at=timezone.now())\n            try:\n                with override_settings(DATABASE_ROUTERS=[ROUTER]):\n                    call_command("migrate",database=alias,interactive=False)\n                reg.status="active"; reg.last_migrated_at=timezone.now(); reg.save(update_fields=["status","last_migrated_at","updated_at"])\n                led.status="pass"; led.completed_at=timezone.now(); led.save(update_fields=["status","completed_at","updated_at"])\n                self.stdout.write(self.style.SUCCESS(alias+": PASS"))\n            except Exception as exc:\n                reg.status="error"; reg.save(update_fields=["status","updated_at"])\n                led.status="fail"; led.completed_at=timezone.now(); led.error_text=str(exc); led.save(update_fields=["status","completed_at","error_text","updated_at"])\n                self.stderr.write(self.style.ERROR(alias+": FAIL: "+str(exc))); raise\n'
BACKUP_CMD='import os, shutil, subprocess\nfrom pathlib import Path\nfrom django.core.management.base import BaseCommand, CommandError\nfrom django.utils import timezone\nfrom apps.platform_tenancy_v3.models import TenantDatabase\nfrom apps.platform_tenancy_v3.runtime import secret_from_ref\n\nclass Command(BaseCommand):\n    help = "Backup one tenant database using pg_dump."\n\n    def add_arguments(self, parser):\n        parser.add_argument("db_alias")\n        parser.add_argument("--output-dir", default=str(Path.home() / "HQNATEX_BACKUPS"))\n\n    def handle(self, *args, **o):\n        pg_dump=shutil.which("pg_dump")\n        if not pg_dump:\n            raise CommandError("pg_dump not found.")\n        reg=TenantDatabase.objects.get(db_alias=o["db_alias"])\n        outdir=Path(o["output_dir"]);outdir.mkdir(parents=True,exist_ok=True)\n        out=outdir / ("%s_%s.dump" % (reg.db_alias, timezone.now().strftime("%Y%m%d_%H%M%S")))\n        env=os.environ.copy();env["PGPASSWORD"]=secret_from_ref(reg.password_secret_ref)\n        cmd=[pg_dump,"-Fc","-h",reg.db_host,"-p",str(reg.db_port),"-U",reg.db_user,"-f",str(out),reg.db_name]\n        p=subprocess.run(cmd,env=env,text=True,capture_output=True)\n        if p.returncode:\n            raise CommandError(p.stderr)\n        reg.last_backup_at=timezone.now()\n        reg.save(update_fields=["last_backup_at","updated_at"])\n        self.stdout.write(self.style.SUCCESS(str(out)))\n'
APPLY_RLS_CMD='import json\nfrom django.core.management.base import BaseCommand\nfrom apps.platform_tenancy_v3.models import TenantDatabase\nfrom apps.platform_tenancy_v3.runtime import register_database_alias\nfrom apps.platform_tenancy_v3.rls import apply_scope_rls, database_role_security\nclass Command(BaseCommand):\n    help="Apply tenant/company FORCE RLS inside one active tenant database."\n    def add_arguments(self,parser): parser.add_argument("db_alias")\n    def handle(self,*args,**o):\n        reg=TenantDatabase.objects.get(db_alias=o["db_alias"],status="active"); alias=register_database_alias(reg); role=database_role_security(alias); rows=apply_scope_rls(alias)\n        self.stdout.write(json.dumps({"database":alias,"role":role[0],"rolsuper":bool(role[1]),"rolbypassrls":bool(role[2]),"count":len(rows),"tables":rows},indent=2)); self.stdout.write(self.style.SUCCESS("Tenant/company FORCE RLS applied."))\n'
TASK_CONTEXT_PY='from .models import TenantDatabase\nfrom .runtime import tenant_database_context\n\ndef require_task_scope(payload):\n    tenant_id=payload.get("tenant_id")\n    company_id=payload.get("company_id")\n    if not tenant_id:\n        raise RuntimeError("tenant_id is required for every tenant business task.")\n    return str(tenant_id), str(company_id) if company_id else None\n\ndef run_in_tenant_task(payload, fn, *args, **kwargs):\n    tenant_id,company_id=require_task_scope(payload)\n    reg=TenantDatabase.objects.get(tenant_id=tenant_id,status="active")\n    with tenant_database_context(reg,company_id=company_id):\n        return fn(*args,**kwargs)\n'

def log(x): print(x,flush=True)
def run(cmd,cwd=None,env=None,check=True):
    log("+ "+" ".join(map(str,cmd)))
    return subprocess.run(list(map(str,cmd)),cwd=str(cwd) if cwd else None,env=env,text=True,capture_output=True,check=check)

def sha256(path):
    h=hashlib.sha256()
    with open(path,"rb") as f:
        for c in iter(lambda:f.read(1024*1024),b""):h.update(c)
    return h.hexdigest()

def write(path,text,overwrite=True):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    if path.exists() and not overwrite:return
    path.write_text(text,encoding="utf-8")

def env_for(core):
    e=os.environ.copy();f=core/".env.core"
    if f.exists():
        for line in f.read_text(encoding="utf-8").splitlines():
            s=line.strip()
            if s and not s.startswith("#") and "=" in s:
                k,v=s.split("=",1);e.setdefault(k.strip(),v.strip().strip('"').strip("'"))
    return e

def detect(root):
    core=root/"core";apps=core/"apps"
    return {
        "manage_py":(core/"manage.py").exists(),
        "settings_py":(core/"config"/"settings.py").exists(),
        "urls_py":(core/"config"/"urls.py").exists(),
        "frontend":(root/"frontend"/"package.json").exists(),
        "tenancy_app":(apps/"tenancy").exists(),
        "companies_app":(apps/"companies").exists(),
        "iam_app":(apps/"iam").exists(),
        "v3_app":(apps/APP).exists(),
        "apps":sorted([p.name for p in apps.iterdir() if p.is_dir()]) if apps.exists() else [],
    }

def require_repo(root):
    d=detect(root)
    if not d["manage_py"] or not d["settings_py"]:
        raise RuntimeError("Run from HQNATEX root; expected core/manage.py and core/config/settings.py")

def source_backup(root):
    outdir=Path.home()/"HQNATEX_BACKUPS";outdir.mkdir(parents=True,exist_ok=True)
    out=outdir/("HQNATEX_BEFORE_MULTITENANT_V3_%s.tar.gz"%dt.datetime.now().strftime("%Y%m%d_%H%M%S"))
    skip={".git","node_modules",".venv","dist","__pycache__",".pytest_cache"}
    with tarfile.open(out,"w:gz") as tf:
        for p in root.rglob("*"):
            rel=p.relative_to(root)
            if any(x in skip for x in rel.parts):continue
            tf.add(p,arcname=str(Path(root.name)/rel),recursive=False)
    return out

def db_info(core,env):
    py=core/".venv"/"bin"/"python";py=str(py if py.exists() else Path(sys.executable))
    code=("import json;from django.conf import settings;d=settings.DATABASES['default'];"
          "print(json.dumps({'ENGINE':d.get('ENGINE'),'NAME':str(d.get('NAME') or ''),"
          "'USER':str(d.get('USER') or ''),'HOST':str(d.get('HOST') or ''),"
          "'PORT':str(d.get('PORT') or ''),'PASSWORD_SET':bool(d.get('PASSWORD'))}))")
    r=run([py,"manage.py","shell","-c",code],cwd=core,env=env)
    rows=[x for x in r.stdout.splitlines() if x.strip().startswith("{")]
    return json.loads(rows[-1]) if rows else {"error":"could_not_read"}

def db_dump(core,env):
    if not shutil.which("pg_dump"):
        raise RuntimeError("pg_dump not found. V3 refuses apply without a verified database backup.")
    outdir=Path.home()/"HQNATEX_BACKUPS";outdir.mkdir(parents=True,exist_ok=True)
    out=outdir/("HQNATEX_BEFORE_MULTITENANT_V3_DB_%s.dump"%dt.datetime.now().strftime("%Y%m%d_%H%M%S"))
    py=core/".venv"/"bin"/"python";py=str(py if py.exists() else Path(sys.executable))
    helper=("import os,subprocess,shutil;from django.conf import settings;d=settings.DATABASES['default'];"
            "cmd=[shutil.which('pg_dump'),'-Fc','-f',os.environ['HQ_DUMP']];"
            "cmd+=['-h',str(d.get('HOST'))] if d.get('HOST') else [];"
            "cmd+=['-p',str(d.get('PORT'))] if d.get('PORT') else [];"
            "u=os.environ.get('HQNATEX_DB_ADMIN_USER');p=os.environ.get('HQNATEX_DB_ADMIN_PASSWORD');assert u and p,'Admin DB credentials required for backup';cmd+=['-U',u];"
            "cmd+=[str(d.get('NAME'))];e=os.environ.copy();"
            "e['PGPASSWORD']=p;"
            "r=subprocess.run(cmd,env=e,text=True,capture_output=True);print(r.stderr);raise SystemExit(r.returncode)")
    e=env.copy();e["HQ_DUMP"]=str(out)
    r=run([py,"manage.py","shell","-c",helper],cwd=core,env=e,check=False)
    if r.returncode!=0 or not out.exists() or out.stat().st_size==0:
        raise RuntimeError("Database backup failed; apply aborted.")
    return out

def patch_installed(settings):
    txt=settings.read_text(encoding="utf-8")
    if '"apps.%s"'%APP in txt or "'apps.%s'"%APP in txt:return False
    marker="INSTALLED_APPS = [";i=txt.find(marker)
    if i<0:raise RuntimeError("INSTALLED_APPS not found")
    pos=txt.find("\n",i)+1
    settings.write_text(txt[:pos]+'    "apps.%s",\n'%APP+txt[pos:],encoding="utf-8");return True

def patch_router(urls):
    txt=urls.read_text(encoding="utf-8");marker="# HQNATEX-V3-PLATFORM-ROUTER"
    if marker in txt:return False
    m=re.search(r"(?m)^(router\s*=\s*DefaultRouter\(\)\s*)$",txt)
    if not m:raise RuntimeError("router = DefaultRouter() not found; no URL patch applied.")
    block="\n"+marker+"\nfrom apps.platform_tenancy_v3.api import register as register_platform_tenancy_v3\nregister_platform_tenancy_v3(router)\n"
    urls.write_text(txt[:m.end()]+block+txt[m.end():],encoding="utf-8");return True

def install_app(root):
    core=root/"core";app=core/"apps"/APP
    if app.exists():raise RuntimeError("platform_tenancy_v3 already exists; refusing overwrite.")
    (app/"management"/"commands").mkdir(parents=True)
    (app/"migrations").mkdir(parents=True)
    files={
        "__init__.py":"",
        "apps.py":APPS_PY,
        "models.py":MODELS_PY,
        "runtime.py":RUNTIME_PY,
        "router.py":ROUTER_PY,
        "rls.py":RLS_PY,
        "permissions.py":PERMISSIONS_PY,
        "serializers.py":SERIALIZERS_PY,
        "views.py":VIEWS_PY,
        "api.py":API_PY,
        "task_context.py":TASK_CONTEXT_PY,
        "management/__init__.py":"",
        "management/commands/__init__.py":"",
        "management/commands/provision_tenant_database.py":PROVISION_CMD,
        "management/commands/migrate_tenant_databases.py":MIGRATE_CMD,
        "management/commands/backup_tenant_database.py":BACKUP_CMD,
        "management/commands/apply_company_rls.py":APPLY_RLS_CMD,
        "migrations/__init__.py":"",
    }
    for rel,src in files.items():write(app/rel,src)
    return app

def audit(root):
    require_repo(root);core=root/"core";env=env_for(core)
    out=detect(root);out["database"]=db_info(core,env)
    out["pg_dump_available"]=bool(shutil.which("pg_dump"))
    out["docker_available"]=bool(shutil.which("docker"))
    return out

def plan(root):
    return {
        "version":VERSION,
        "repository":audit(root),
        "apply_foundation_changes":[
            "source backup",
            "required PostgreSQL pg_dump backup",
            "create apps.platform_tenancy_v3",
            "control-plane models and API",
            "tenant DB provision/migrate/backup commands",
            "company FORCE RLS helper",
            "cache/file/task tenant namespace helpers",
            "makemigrations + migrate default control-plane DB",
            "Django checks + tests"
        ],
        "not_automatic":[
            "move existing tenant business data",
            "enable DATABASE_ROUTERS",
            "cut over application traffic",
            "grant BYPASSRLS",
            "store tenant DB passwords in database"
        ]
    }

def apply_foundation(root):
    require_repo(root);core=root/"core";env=env_for(core)
    pre=audit(root)
    if pre["v3_app"]:raise RuntimeError("V3 app already exists; run verify.")
    if not pre["tenancy_app"] or not pre["companies_app"]:
        raise RuntimeError("Existing tenancy and companies apps are required.")
    report={"version":VERSION,"started_at":dt.datetime.now().isoformat(),"validation":{}}
    sb=source_backup(root);report["source_backup"]=str(sb);report["source_backup_sha256"]=sha256(sb)
    db=db_dump(core,env);report["database_backup"]=str(db);report["database_backup_sha256"]=sha256(db)
    install_app(root);patch_installed(core/"config"/"settings.py");patch_router(core/"config"/"urls.py")
    py=core/".venv"/"bin"/"python";py=str(py if py.exists() else Path(sys.executable))
    run([py,"manage.py","check"],cwd=core,env=env);report["validation"]["check_pre"]="PASS"
    run([py,"manage.py","makemigrations",APP],cwd=core,env=env);report["validation"]["makemigrations"]="PASS"
    run([py,"manage.py","migrate","--noinput"],cwd=core,env=env);report["validation"]["migrate"]="PASS"
    run([py,"manage.py","check"],cwd=core,env=env);report["validation"]["check_post"]="PASS"
    t=run([py,"manage.py","test","--keepdb","--noinput"],cwd=core,env=env,check=False)
    report["validation"]["tests"]="PASS" if t.returncode==0 else "FAIL(%d)"%t.returncode
    if t.returncode!=0: raise RuntimeError("Django tests failed; foundation apply aborted.")
    rolecode=("from django.db import connection;c=connection.cursor();"
              "c.execute(\"SELECT current_user,rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user\");print(c.fetchone())")
    rr=run([py,"manage.py","shell","-c",rolecode],cwd=core,env=env,check=False)
    report["db_role_audit"]=rr.stdout[-2000:]
    report["router_enabled"]=False
    report["cutover_status"]="NOT_STARTED"
    docs=root/"docs";docs.mkdir(exist_ok=True)
    out=docs/"HQNATEX_MULTITENANT_V3_FOUNDATION_REPORT.json";write(out,json.dumps(report,ensure_ascii=False,indent=2))
    return out,report

def main():
    ap=argparse.ArgumentParser();g=ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--audit",action="store_true");g.add_argument("--plan",action="store_true");g.add_argument("--apply-foundation",action="store_true")
    a=ap.parse_args();root=Path.cwd().resolve()
    if a.audit:print(json.dumps(audit(root),ensure_ascii=False,indent=2));return
    if a.plan:print(json.dumps(plan(root),ensure_ascii=False,indent=2));return
    out,report=apply_foundation(root)
    print(json.dumps({"status":"FOUNDATION_INSTALLED","report":str(out),"tests":report["validation"].get("tests"),"router_enabled":False,"cutover_status":"NOT_STARTED"},ensure_ascii=False,indent=2))

if __name__=="__main__":main()
