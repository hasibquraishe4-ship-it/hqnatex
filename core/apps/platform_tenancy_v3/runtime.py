import contextvars
import os
import re
from copy import deepcopy
from django.conf import settings
from django.db import connections

_current_db_alias = contextvars.ContextVar("hqnatex_current_db_alias", default="default")
_current_tenant_id = contextvars.ContextVar("hqnatex_current_tenant_id", default=None)
_current_company_id = contextvars.ContextVar("hqnatex_current_company_id", default=None)
_SAFE_ALIAS = re.compile(r"^[a-z][a-z0-9_]{0,62}$")

def current_database_alias():
    return _current_db_alias.get()

def current_tenant_id():
    return _current_tenant_id.get()

def current_company_id():
    return _current_company_id.get()

def secret_from_ref(secret_ref):
    if not secret_ref.startswith("env:"):
        raise RuntimeError("Only env: secret references are enabled.")
    key = secret_ref[4:]
    value = os.environ.get(key)
    if not value:
        raise RuntimeError("Required secret environment variable is not set: " + key)
    return value

def register_database_alias(registry):
    alias = registry.db_alias
    if not _SAFE_ALIAS.match(alias):
        raise RuntimeError("Unsafe database alias.")
    if alias in connections.databases:
        return alias
    base = deepcopy(settings.DATABASES["default"])
    base.update({
        "NAME": registry.db_name,
        "HOST": registry.db_host,
        "PORT": str(registry.db_port),
        "USER": registry.db_user,
        "PASSWORD": secret_from_ref(registry.password_secret_ref),
    })
    connections.databases[alias] = base
    return alias

class tenant_database_context:
    def __init__(self, registry, company_id=None):
        self.registry = registry
        self.company_id = company_id
        self.tokens = []

    def __enter__(self):
        alias = register_database_alias(self.registry)
        self.tokens = [
            (_current_db_alias, _current_db_alias.set(alias)),
            (_current_tenant_id, _current_tenant_id.set(str(self.registry.tenant_id))),
            (_current_company_id, _current_company_id.set(str(self.company_id) if self.company_id else None)),
        ]
        return alias

    def __exit__(self, exc_type, exc, tb):
        for var, token in reversed(self.tokens):
            var.reset(token)

def scoped_cache_key(key, tenant_id=None, company_id=None):
    tenant = str(tenant_id or current_tenant_id() or "")
    company = str(company_id or current_company_id() or "")
    if not tenant:
        raise RuntimeError("Tenant context is required for business cache keys.")
    return "tenant:%s:company:%s:%s" % (tenant, company or "-", key)

def scoped_storage_path(path, tenant_id=None, company_id=None):
    tenant = str(tenant_id or current_tenant_id() or "")
    company = str(company_id or current_company_id() or "")
    if not tenant:
        raise RuntimeError("Tenant context is required for business file paths.")
    clean = path.lstrip("/").replace("..", "_")
    return "tenants/%s/companies/%s/%s" % (tenant, company or "-", clean)
