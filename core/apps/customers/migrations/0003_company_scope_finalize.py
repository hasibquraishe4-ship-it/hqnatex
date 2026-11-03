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
                UPDATE customers_customer_services x SET company_id=c.company_id
                FROM customers_customers c
                WHERE x.tenant_id=%s AND c.tenant_id=x.tenant_id
                  AND c.id=x.customer_id AND x.company_id IS NULL
            """,[tenant_id])
            _zero(cursor,"""
                SELECT COUNT(*) FROM customers_customer_services x
                LEFT JOIN customers_customers c ON c.id=x.customer_id AND c.tenant_id=x.tenant_id
                LEFT JOIN branches_branches b ON b.id=x.branch_id AND b.tenant_id=x.tenant_id
                LEFT JOIN agencies_agencies a ON a.id=x.agency_id AND a.tenant_id=x.tenant_id
                WHERE x.company_id IS NULL OR c.id IS NULL
                   OR x.company_id IS DISTINCT FROM c.company_id
                   OR (b.id IS NOT NULL AND b.company_id IS DISTINCT FROM x.company_id)
                   OR (a.id IS NOT NULL AND a.company_id IS DISTINCT FROM x.company_id)
            ""","customers_customer_services")
            for table in ("customers_service_change_requests","customers_service_package_history","customers_service_status_history"):
                cursor.execute(f"""
                    UPDATE {table} x SET company_id=cs.company_id
                    FROM customers_customer_services cs
                    WHERE x.tenant_id=%s AND cs.tenant_id=x.tenant_id
                      AND cs.id=x.customer_service_id AND x.company_id IS NULL
                """,[tenant_id])
                _zero(cursor,f"""
                    SELECT COUNT(*) FROM {table} x
                    LEFT JOIN customers_customer_services cs ON cs.id=x.customer_service_id AND cs.tenant_id=x.tenant_id
                    WHERE x.company_id IS NULL OR cs.id IS NULL
                       OR x.company_id IS DISTINCT FROM cs.company_id
                """,table)

class Migration(migrations.Migration):
    dependencies=[("customers","0002_customerservice_company_servicechangerequest_company_and_more")]
    operations=[
        migrations.RunPython(backfill,migrations.RunPython.noop),
        migrations.AlterField(model_name="customerservice",name="company",field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="customer_services_company_scope",to="companies.company")),
        migrations.AlterField(model_name="servicechangerequest",name="company",field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="service_change_requests_company_scope",to="companies.company")),
        migrations.AlterField(model_name="servicepackagehistory",name="company",field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="service_package_history_company_scope",to="companies.company")),
        migrations.AlterField(model_name="servicestatushistory",name="company",field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="service_status_history_company_scope",to="companies.company")),
        migrations.RunSQL(sql=r"""CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_tenant_id_ref
    ON companies_companies (tenant_id, id);
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname='fk_customer_service_tenant_company'
        AND conrelid='customers_customer_services'::regclass
  ) THEN
    ALTER TABLE customers_customer_services
      ADD CONSTRAINT fk_customer_service_tenant_company
      FOREIGN KEY (tenant_id, company_id)
      REFERENCES companies_companies(tenant_id, id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;
""",reverse_sql="ALTER TABLE customers_customer_services DROP CONSTRAINT IF EXISTS fk_customer_service_tenant_company;"),
        migrations.RunSQL(sql=r"""CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_tenant_id_ref
    ON companies_companies (tenant_id, id);
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname='fk_change_req_tenant_company'
        AND conrelid='customers_service_change_requests'::regclass
  ) THEN
    ALTER TABLE customers_service_change_requests
      ADD CONSTRAINT fk_change_req_tenant_company
      FOREIGN KEY (tenant_id, company_id)
      REFERENCES companies_companies(tenant_id, id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;
""",reverse_sql="ALTER TABLE customers_service_change_requests DROP CONSTRAINT IF EXISTS fk_change_req_tenant_company;"),
        migrations.RunSQL(sql=r"""CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_tenant_id_ref
    ON companies_companies (tenant_id, id);
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname='fk_pkg_hist_tenant_company'
        AND conrelid='customers_service_package_history'::regclass
  ) THEN
    ALTER TABLE customers_service_package_history
      ADD CONSTRAINT fk_pkg_hist_tenant_company
      FOREIGN KEY (tenant_id, company_id)
      REFERENCES companies_companies(tenant_id, id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;
""",reverse_sql="ALTER TABLE customers_service_package_history DROP CONSTRAINT IF EXISTS fk_pkg_hist_tenant_company;"),
        migrations.RunSQL(sql=r"""CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_tenant_id_ref
    ON companies_companies (tenant_id, id);
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname='fk_status_hist_tenant_company'
        AND conrelid='customers_service_status_history'::regclass
  ) THEN
    ALTER TABLE customers_service_status_history
      ADD CONSTRAINT fk_status_hist_tenant_company
      FOREIGN KEY (tenant_id, company_id)
      REFERENCES companies_companies(tenant_id, id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;
""",reverse_sql="ALTER TABLE customers_service_status_history DROP CONSTRAINT IF EXISTS fk_status_hist_tenant_company;"),
        migrations.RunSQL(sql=r"""
CREATE OR REPLACE FUNCTION hq_scope_customer_service_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected uuid; other uuid;
BEGIN
  SELECT company_id INTO expected
  FROM customers_customers
  WHERE id=NEW.customer_id AND tenant_id=NEW.tenant_id;
  IF expected IS NULL THEN RAISE EXCEPTION 'customer company cannot be resolved'; END IF;

  IF NEW.branch_id IS NOT NULL THEN
    SELECT company_id INTO other FROM branches_branches
    WHERE id=NEW.branch_id AND tenant_id=NEW.tenant_id;
    IF other IS NULL OR other<>expected THEN RAISE EXCEPTION 'customer service branch company mismatch'; END IF;
  END IF;
  IF NEW.agency_id IS NOT NULL THEN
    SELECT company_id INTO other FROM agencies_agencies
    WHERE id=NEW.agency_id AND tenant_id=NEW.tenant_id;
    IF other IS NULL OR other<>expected THEN RAISE EXCEPTION 'customer service agency company mismatch'; END IF;
  END IF;

  IF NEW.company_id IS NULL THEN NEW.company_id:=expected;
  ELSIF NEW.company_id<>expected THEN RAISE EXCEPTION 'customer service company mismatch';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS hq_scope_customer_service_trg ON customers_customer_services;
CREATE TRIGGER hq_scope_customer_service_trg
BEFORE INSERT OR UPDATE ON customers_customer_services
FOR EACH ROW EXECUTE FUNCTION hq_scope_customer_service_fn();

CREATE OR REPLACE FUNCTION hq_scope_service_change_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected uuid;
BEGIN
  SELECT company_id INTO expected FROM customers_customer_services
  WHERE id=NEW.customer_service_id AND tenant_id=NEW.tenant_id;
  IF expected IS NULL THEN RAISE EXCEPTION 'customer service company cannot be resolved'; END IF;
  IF NEW.company_id IS NULL THEN NEW.company_id:=expected;
  ELSIF NEW.company_id<>expected THEN RAISE EXCEPTION 'service change company mismatch'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS hq_scope_service_change_trg ON customers_service_change_requests;
CREATE TRIGGER hq_scope_service_change_trg
BEFORE INSERT OR UPDATE ON customers_service_change_requests
FOR EACH ROW EXECUTE FUNCTION hq_scope_service_change_fn();

CREATE OR REPLACE FUNCTION hq_scope_pkg_history_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected uuid;
BEGIN
  SELECT company_id INTO expected FROM customers_customer_services
  WHERE id=NEW.customer_service_id AND tenant_id=NEW.tenant_id;
  IF expected IS NULL THEN RAISE EXCEPTION 'customer service company cannot be resolved'; END IF;
  IF NEW.company_id IS NULL THEN NEW.company_id:=expected;
  ELSIF NEW.company_id<>expected THEN RAISE EXCEPTION 'package history company mismatch'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS hq_scope_pkg_history_trg ON customers_service_package_history;
CREATE TRIGGER hq_scope_pkg_history_trg
BEFORE INSERT OR UPDATE ON customers_service_package_history
FOR EACH ROW EXECUTE FUNCTION hq_scope_pkg_history_fn();

CREATE OR REPLACE FUNCTION hq_scope_status_history_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected uuid;
BEGIN
  SELECT company_id INTO expected FROM customers_customer_services
  WHERE id=NEW.customer_service_id AND tenant_id=NEW.tenant_id;
  IF expected IS NULL THEN RAISE EXCEPTION 'customer service company cannot be resolved'; END IF;
  IF NEW.company_id IS NULL THEN NEW.company_id:=expected;
  ELSIF NEW.company_id<>expected THEN RAISE EXCEPTION 'status history company mismatch'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS hq_scope_status_history_trg ON customers_service_status_history;
CREATE TRIGGER hq_scope_status_history_trg
BEFORE INSERT OR UPDATE ON customers_service_status_history
FOR EACH ROW EXECUTE FUNCTION hq_scope_status_history_fn();
""",reverse_sql=r"""
            DROP TRIGGER IF EXISTS hq_scope_customer_service_trg ON customers_customer_services;
            DROP TRIGGER IF EXISTS hq_scope_service_change_trg ON customers_service_change_requests;
            DROP TRIGGER IF EXISTS hq_scope_pkg_history_trg ON customers_service_package_history;
            DROP TRIGGER IF EXISTS hq_scope_status_history_trg ON customers_service_status_history;
            DROP FUNCTION IF EXISTS hq_scope_customer_service_fn();
            DROP FUNCTION IF EXISTS hq_scope_service_change_fn();
            DROP FUNCTION IF EXISTS hq_scope_pkg_history_fn();
            DROP FUNCTION IF EXISTS hq_scope_status_history_fn();
        """),
    ]
