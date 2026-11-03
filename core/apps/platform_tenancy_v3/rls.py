from django.db import connections, transaction

def set_rls_context(database_alias, tenant_id, company_id=None):
    conn=connections[database_alias]
    with conn.cursor() as cur:
        cur.execute("SELECT set_config('app.current_tenant_id', %s, true)",[str(tenant_id)])
        cur.execute("SELECT set_config('app.current_company_id', %s, true)",[str(company_id or "")])

def scoped_table_metadata(database_alias):
    conn=connections[database_alias]
    with conn.cursor() as cur:
        cur.execute("""SELECT table_name, MAX(CASE WHEN column_name='tenant_id' THEN 1 ELSE 0 END), MAX(CASE WHEN column_name='company_id' THEN 1 ELSE 0 END), MAX(CASE WHEN column_name='company_id' AND is_nullable='YES' THEN 1 ELSE 0 END) FROM information_schema.columns WHERE table_schema='public' AND column_name IN ('tenant_id','company_id') GROUP BY table_name ORDER BY table_name""")
        return [{"table":r[0],"has_tenant":bool(r[1]),"has_company":bool(r[2]),"company_nullable":bool(r[3])} for r in cur.fetchall()]

def database_role_security(database_alias):
    conn=connections[database_alias]
    with conn.cursor() as cur:
        cur.execute("SELECT current_user, rolsuper, rolbypassrls FROM pg_roles WHERE rolname=current_user"); return cur.fetchone()

def apply_scope_rls(database_alias):
    role=database_role_security(database_alias)
    if not role: raise RuntimeError("Could not inspect tenant database role")
    if role[1] or role[2]: raise RuntimeError("Refusing RLS: tenant application role is SUPERUSER/BYPASSRLS")
    conn=connections[database_alias]; meta=scoped_table_metadata(database_alias); applied=[]
    with transaction.atomic(using=database_alias):
        with conn.cursor() as cur:
            for item in meta:
                table=item["table"]
                if not table.replace("_","").isalnum(): raise RuntimeError("Unsafe table name: "+table)
                clauses=[]
                if item["has_tenant"]: clauses.append("tenant_id::text = current_setting('app.current_tenant_id', true)")
                if item["has_company"]:
                    cm="company_id::text = current_setting('app.current_company_id', true)"
                    clauses.append("("+cm+" OR company_id IS NULL)" if item["company_nullable"] else cm)
                cond=" AND ".join(clauses)
                policy=table+"_scope_isolation"; qt=conn.ops.quote_name(table); qp=conn.ops.quote_name(policy)
                cur.execute("ALTER TABLE %s ENABLE ROW LEVEL SECURITY"%qt); cur.execute("ALTER TABLE %s FORCE ROW LEVEL SECURITY"%qt)
                cur.execute("DROP POLICY IF EXISTS %s ON %s"%(qp,qt)); cur.execute("CREATE POLICY %s ON %s USING (%s) WITH CHECK (%s)"%(qp,qt,cond,cond))
                applied.append(item)
    return applied
