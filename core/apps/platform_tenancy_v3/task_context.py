from .models import TenantDatabase
from .runtime import tenant_database_context

def require_task_scope(payload):
    tenant_id=payload.get("tenant_id")
    company_id=payload.get("company_id")
    if not tenant_id:
        raise RuntimeError("tenant_id is required for every tenant business task.")
    return str(tenant_id), str(company_id) if company_id else None

def run_in_tenant_task(payload, fn, *args, **kwargs):
    tenant_id,company_id=require_task_scope(payload)
    reg=TenantDatabase.objects.get(tenant_id=tenant_id,status="active")
    with tenant_database_context(reg,company_id=company_id):
        return fn(*args,**kwargs)
