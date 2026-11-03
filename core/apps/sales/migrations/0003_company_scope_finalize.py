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
                UPDATE sales_sale_items x SET company_id=s.company_id
                FROM sales_sales s
                WHERE x.tenant_id=%s AND s.tenant_id=x.tenant_id
                  AND s.id=x.sale_id AND x.company_id IS NULL
            """,[tenant_id])
            _zero(cursor,"""
                SELECT COUNT(*) FROM sales_sale_items x
                LEFT JOIN sales_sales s ON s.id=x.sale_id AND s.tenant_id=x.tenant_id
                WHERE x.company_id IS NULL OR s.id IS NULL
                   OR x.company_id IS DISTINCT FROM s.company_id
            ""","sales_sale_items")

class Migration(migrations.Migration):
    dependencies=[("sales","0002_saleitem_company")]
    operations=[
        migrations.RunPython(backfill,migrations.RunPython.noop),
        migrations.AlterField(
            model_name="saleitem",name="company",
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="sale_items_company_scope",to="companies.company"),
        ),
        migrations.RunSQL(sql=r"""CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_tenant_id_ref
    ON companies_companies (tenant_id, id);
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname='fk_sale_item_tenant_company'
        AND conrelid='sales_sale_items'::regclass
  ) THEN
    ALTER TABLE sales_sale_items
      ADD CONSTRAINT fk_sale_item_tenant_company
      FOREIGN KEY (tenant_id, company_id)
      REFERENCES companies_companies(tenant_id, id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;
""",reverse_sql="ALTER TABLE sales_sale_items DROP CONSTRAINT IF EXISTS fk_sale_item_tenant_company;"),
        migrations.RunSQL(sql=r"""
CREATE OR REPLACE FUNCTION hq_scope_sales_sale_items_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected uuid;
BEGIN
  SELECT company_id INTO expected
  FROM sales_sales
  WHERE id=NEW.sale_id AND tenant_id=NEW.tenant_id;
  IF expected IS NULL THEN
    RAISE EXCEPTION 'sale company cannot be resolved';
  END IF;
  IF NEW.company_id IS NULL THEN
    NEW.company_id:=expected;
  ELSIF NEW.company_id<>expected THEN
    RAISE EXCEPTION 'sale item company mismatch';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS hq_scope_sales_sale_items_trg ON sales_sale_items;
CREATE TRIGGER hq_scope_sales_sale_items_trg
BEFORE INSERT OR UPDATE ON sales_sale_items
FOR EACH ROW EXECUTE FUNCTION hq_scope_sales_sale_items_fn();
""",reverse_sql=r"""DROP TRIGGER IF EXISTS hq_scope_sales_sale_items_trg ON sales_sale_items; DROP FUNCTION IF EXISTS hq_scope_sales_sale_items_fn();"""),
    ]
