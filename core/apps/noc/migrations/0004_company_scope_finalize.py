from django.db import migrations, models
import django.db.models.deletion

def _tenant_ids(schema_editor):
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("SELECT id::text FROM tenancy_tenants ORDER BY id")
        return [r[0] for r in cursor.fetchall()]

def _ctx(cursor, tenant_id):
    cursor.execute("SELECT set_config('app.current_tenant_id', %s, true)", [str(tenant_id)])
    cursor.execute("SELECT set_config('app.current_company_id', '', true)")

def _zero(cursor, sql, label):
    cursor.execute(sql)
    n=cursor.fetchone()[0]
    if n:
        raise RuntimeError(f"{label}: {n} invalid rows")


def backfill(apps, schema_editor):
    for tenant_id in _tenant_ids(schema_editor):
        with schema_editor.connection.cursor() as cursor:
            _ctx(cursor,tenant_id)
            cursor.execute("""
                WITH RECURSIVE resolved AS (
                    SELECT n.id,n.tenant_id,b.company_id,ARRAY[n.id]::uuid[] path
                    FROM noc_network_resources n
                    JOIN branches_branches b ON b.id=n.branch_id AND b.tenant_id=n.tenant_id
                    WHERE n.tenant_id=%s AND b.company_id IS NOT NULL
                    UNION ALL
                    SELECT child.id,child.tenant_id,parent_res.company_id,parent_res.path||child.id
                    FROM noc_network_resources child
                    JOIN resolved parent_res ON child.parent_id=parent_res.id AND child.tenant_id=parent_res.tenant_id
                    WHERE child.tenant_id=%s AND NOT child.id=ANY(parent_res.path)
                ),one_company AS (
                    SELECT id,tenant_id,MIN(company_id::text)::uuid company_id
                    FROM resolved GROUP BY id,tenant_id HAVING COUNT(DISTINCT company_id)=1
                )
                UPDATE noc_network_resources n SET company_id=r.company_id
                FROM one_company r
                WHERE n.id=r.id AND n.tenant_id=r.tenant_id AND n.company_id IS NULL
            """,[tenant_id,tenant_id])
            _zero(cursor,"SELECT COUNT(*) FROM noc_network_resources WHERE company_id IS NULL","noc_network_resources unresolved")
            _zero(cursor,"""
                SELECT COUNT(*) FROM noc_network_resources n
                LEFT JOIN branches_branches b ON b.id=n.branch_id AND b.tenant_id=n.tenant_id
                LEFT JOIN noc_network_resources p ON p.id=n.parent_id AND p.tenant_id=n.tenant_id
                WHERE (b.id IS NOT NULL AND b.company_id IS DISTINCT FROM n.company_id)
                   OR (p.id IS NOT NULL AND p.company_id IS DISTINCT FROM n.company_id)
            ""","noc_network_resources mismatch")
            cursor.execute("""
                UPDATE noc_customer_service_resources x SET company_id=cs.company_id
                FROM customers_customer_services cs
                WHERE x.tenant_id=%s AND cs.tenant_id=x.tenant_id
                  AND cs.id=x.customer_service_id AND x.company_id IS NULL
            """,[tenant_id])
            _zero(cursor,"""
                SELECT COUNT(*) FROM noc_customer_service_resources x
                LEFT JOIN customers_customer_services cs ON cs.id=x.customer_service_id AND cs.tenant_id=x.tenant_id
                LEFT JOIN noc_network_resources nr ON nr.id=x.resource_id AND nr.tenant_id=x.tenant_id
                WHERE x.company_id IS NULL OR cs.id IS NULL OR nr.id IS NULL
                   OR x.company_id IS DISTINCT FROM cs.company_id
                   OR x.company_id IS DISTINCT FROM nr.company_id
            ""","noc_customer_service_resources")

class Migration(migrations.Migration):
    dependencies=[("noc","0003_customerservicenetworkresource_company_and_more"),("customers","0003_company_scope_finalize")]
    operations=[
        migrations.RunPython(backfill,migrations.RunPython.noop),
        migrations.AlterField(model_name="networkresource",name="company",field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="network_resources_company_scope",to="companies.company")),
        migrations.AlterField(model_name="customerservicenetworkresource",name="company",field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="customer_service_network_resources_company_scope",to="companies.company")),
        migrations.RunSQL(sql=r"""CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_tenant_id_ref
    ON companies_companies (tenant_id, id);
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname='fk_noc_resource_tenant_company'
        AND conrelid='noc_network_resources'::regclass
  ) THEN
    ALTER TABLE noc_network_resources
      ADD CONSTRAINT fk_noc_resource_tenant_company
      FOREIGN KEY (tenant_id, company_id)
      REFERENCES companies_companies(tenant_id, id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;
""",reverse_sql="ALTER TABLE noc_network_resources DROP CONSTRAINT IF EXISTS fk_noc_resource_tenant_company;"),
        migrations.RunSQL(sql=r"""CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_tenant_id_ref
    ON companies_companies (tenant_id, id);
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname='fk_noc_assign_tenant_company'
        AND conrelid='noc_customer_service_resources'::regclass
  ) THEN
    ALTER TABLE noc_customer_service_resources
      ADD CONSTRAINT fk_noc_assign_tenant_company
      FOREIGN KEY (tenant_id, company_id)
      REFERENCES companies_companies(tenant_id, id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;
""",reverse_sql="ALTER TABLE noc_customer_service_resources DROP CONSTRAINT IF EXISTS fk_noc_assign_tenant_company;"),
        migrations.RunSQL(sql=r"""
CREATE OR REPLACE FUNCTION hq_scope_noc_resource_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE bcompany uuid; pcompany uuid; single_company uuid; company_count integer;
BEGIN
  IF NEW.branch_id IS NOT NULL THEN
    SELECT company_id INTO bcompany FROM branches_branches
    WHERE id=NEW.branch_id AND tenant_id=NEW.tenant_id;
    IF bcompany IS NULL THEN RAISE EXCEPTION 'NOC branch company cannot be resolved'; END IF;
  END IF;
  IF NEW.parent_id IS NOT NULL THEN
    SELECT company_id INTO pcompany FROM noc_network_resources
    WHERE id=NEW.parent_id AND tenant_id=NEW.tenant_id;
    IF pcompany IS NULL THEN RAISE EXCEPTION 'NOC parent company cannot be resolved'; END IF;
  END IF;
  IF bcompany IS NOT NULL AND pcompany IS NOT NULL AND bcompany<>pcompany THEN
    RAISE EXCEPTION 'NOC branch/parent company mismatch';
  END IF;

  IF NEW.company_id IS NULL THEN
    NEW.company_id:=COALESCE(bcompany,pcompany);
  END IF;

  IF NEW.company_id IS NULL THEN
    SELECT COUNT(*),MIN(id::text)::uuid INTO company_count,single_company
    FROM companies_companies WHERE tenant_id=NEW.tenant_id;
    IF company_count=1 THEN NEW.company_id:=single_company; END IF;
  END IF;

  IF NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'company is required for a root NOC resource in a multi-company tenant';
  END IF;
  IF bcompany IS NOT NULL AND NEW.company_id<>bcompany THEN RAISE EXCEPTION 'NOC branch company mismatch'; END IF;
  IF pcompany IS NOT NULL AND NEW.company_id<>pcompany THEN RAISE EXCEPTION 'NOC parent company mismatch'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS hq_scope_noc_resource_trg ON noc_network_resources;
CREATE TRIGGER hq_scope_noc_resource_trg
BEFORE INSERT OR UPDATE ON noc_network_resources
FOR EACH ROW EXECUTE FUNCTION hq_scope_noc_resource_fn();

CREATE OR REPLACE FUNCTION hq_scope_noc_assign_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected uuid; other uuid;
BEGIN
  SELECT company_id INTO expected FROM customers_customer_services
  WHERE id=NEW.customer_service_id AND tenant_id=NEW.tenant_id;
  SELECT company_id INTO other FROM noc_network_resources
  WHERE id=NEW.resource_id AND tenant_id=NEW.tenant_id;
  IF expected IS NULL OR other IS NULL OR expected<>other THEN
    RAISE EXCEPTION 'NOC assignment parent company mismatch';
  END IF;
  IF NEW.company_id IS NULL THEN NEW.company_id:=expected;
  ELSIF NEW.company_id<>expected THEN RAISE EXCEPTION 'NOC assignment company mismatch'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS hq_scope_noc_assign_trg ON noc_customer_service_resources;
CREATE TRIGGER hq_scope_noc_assign_trg
BEFORE INSERT OR UPDATE ON noc_customer_service_resources
FOR EACH ROW EXECUTE FUNCTION hq_scope_noc_assign_fn();
""",reverse_sql=r"""
            DROP TRIGGER IF EXISTS hq_scope_noc_resource_trg ON noc_network_resources;
            DROP TRIGGER IF EXISTS hq_scope_noc_assign_trg ON noc_customer_service_resources;
            DROP FUNCTION IF EXISTS hq_scope_noc_resource_fn();
            DROP FUNCTION IF EXISTS hq_scope_noc_assign_fn();
        """),
    ]
