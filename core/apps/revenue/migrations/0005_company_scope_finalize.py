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
                UPDATE revenue_allocations x SET company_id=rt.company_id
                FROM revenue_transactions rt
                WHERE x.tenant_id=%s AND rt.tenant_id=x.tenant_id
                  AND rt.id=x.revenue_transaction_id AND x.company_id IS NULL
            """,[tenant_id])
            _zero(cursor,"""
                SELECT COUNT(*) FROM revenue_allocations x
                LEFT JOIN revenue_transactions rt ON rt.id=x.revenue_transaction_id AND rt.tenant_id=x.tenant_id
                LEFT JOIN revenue_share_rules sr ON sr.id=x.share_rule_id AND sr.tenant_id=x.tenant_id
                WHERE x.company_id IS NULL OR rt.id IS NULL
                   OR x.company_id IS DISTINCT FROM rt.company_id
                   OR (sr.id IS NOT NULL AND sr.company_id IS DISTINCT FROM x.company_id)
            ""","revenue_allocations")

class Migration(migrations.Migration):
    dependencies=[("revenue","0004_revenueallocation_company")]
    operations=[
        migrations.RunPython(backfill,migrations.RunPython.noop),
        migrations.AlterField(model_name="revenueallocation",name="company",field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="revenue_allocations_company_scope",to="companies.company")),
        migrations.RunSQL(sql=r"""CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_tenant_id_ref
    ON companies_companies (tenant_id, id);
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname='fk_rev_alloc_tenant_company'
        AND conrelid='revenue_allocations'::regclass
  ) THEN
    ALTER TABLE revenue_allocations
      ADD CONSTRAINT fk_rev_alloc_tenant_company
      FOREIGN KEY (tenant_id, company_id)
      REFERENCES companies_companies(tenant_id, id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;
""",reverse_sql="ALTER TABLE revenue_allocations DROP CONSTRAINT IF EXISTS fk_rev_alloc_tenant_company;"),
        migrations.RunSQL(sql=r"""
CREATE OR REPLACE FUNCTION hq_scope_revenue_alloc_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected uuid; other uuid;
BEGIN
  SELECT company_id INTO expected FROM revenue_transactions
  WHERE id=NEW.revenue_transaction_id AND tenant_id=NEW.tenant_id;
  IF expected IS NULL THEN RAISE EXCEPTION 'revenue transaction company cannot be resolved'; END IF;
  IF NEW.share_rule_id IS NOT NULL THEN
    SELECT company_id INTO other FROM revenue_share_rules
    WHERE id=NEW.share_rule_id AND tenant_id=NEW.tenant_id;
    IF other IS NULL OR other<>expected THEN RAISE EXCEPTION 'revenue allocation share rule company mismatch'; END IF;
  END IF;
  IF NEW.company_id IS NULL THEN NEW.company_id:=expected;
  ELSIF NEW.company_id<>expected THEN RAISE EXCEPTION 'revenue allocation company mismatch'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS hq_scope_revenue_alloc_trg ON revenue_allocations;
CREATE TRIGGER hq_scope_revenue_alloc_trg
BEFORE INSERT OR UPDATE ON revenue_allocations
FOR EACH ROW EXECUTE FUNCTION hq_scope_revenue_alloc_fn();
""",reverse_sql=r"""DROP TRIGGER IF EXISTS hq_scope_revenue_alloc_trg ON revenue_allocations; DROP FUNCTION IF EXISTS hq_scope_revenue_alloc_fn();"""),
    ]
