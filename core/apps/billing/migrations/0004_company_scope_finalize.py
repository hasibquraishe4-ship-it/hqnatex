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
                UPDATE billing_invoice_items x SET company_id=inv.company_id
                FROM billing_invoices inv
                WHERE x.tenant_id=%s AND inv.tenant_id=x.tenant_id
                  AND inv.id=x.invoice_id AND x.company_id IS NULL
            """,[tenant_id])
            _zero(cursor,"""
                SELECT COUNT(*) FROM billing_invoice_items x
                LEFT JOIN billing_invoices inv ON inv.id=x.invoice_id AND inv.tenant_id=x.tenant_id
                LEFT JOIN sales_sale_items si ON si.id=x.sale_item_id AND si.tenant_id=x.tenant_id
                WHERE x.company_id IS NULL OR inv.id IS NULL
                   OR x.company_id IS DISTINCT FROM inv.company_id
                   OR (si.id IS NOT NULL AND si.company_id IS DISTINCT FROM x.company_id)
            ""","billing_invoice_items")

            cursor.execute("""
                UPDATE billing_receivables x SET company_id=inv.company_id
                FROM billing_invoices inv
                WHERE x.tenant_id=%s AND inv.tenant_id=x.tenant_id
                  AND inv.id=x.invoice_id AND x.company_id IS NULL
            """,[tenant_id])
            _zero(cursor,"""
                SELECT COUNT(*) FROM billing_receivables x
                LEFT JOIN billing_invoices inv ON inv.id=x.invoice_id AND inv.tenant_id=x.tenant_id
                LEFT JOIN customers_customers c ON c.id=x.customer_id AND c.tenant_id=x.tenant_id
                WHERE x.company_id IS NULL OR inv.id IS NULL OR c.id IS NULL
                   OR x.company_id IS DISTINCT FROM inv.company_id
                   OR x.company_id IS DISTINCT FROM c.company_id
            ""","billing_receivables")

            cursor.execute("""
                UPDATE billing_payment_allocations x SET company_id=p.company_id
                FROM billing_payments p
                WHERE x.tenant_id=%s AND p.tenant_id=x.tenant_id
                  AND p.id=x.payment_id AND x.company_id IS NULL
            """,[tenant_id])
            _zero(cursor,"""
                SELECT COUNT(*) FROM billing_payment_allocations x
                LEFT JOIN billing_payments p ON p.id=x.payment_id AND p.tenant_id=x.tenant_id
                LEFT JOIN billing_receivables r ON r.id=x.receivable_id AND r.tenant_id=x.tenant_id
                WHERE x.company_id IS NULL OR p.id IS NULL OR r.id IS NULL
                   OR x.company_id IS DISTINCT FROM p.company_id
                   OR x.company_id IS DISTINCT FROM r.company_id
            ""","billing_payment_allocations")

            cursor.execute("""
                UPDATE billing_receipts x SET company_id=p.company_id
                FROM billing_payments p
                WHERE x.tenant_id=%s AND p.tenant_id=x.tenant_id
                  AND p.id=x.payment_id AND x.company_id IS NULL
            """,[tenant_id])
            _zero(cursor,"""
                SELECT COUNT(*) FROM billing_receipts x
                LEFT JOIN billing_payments p ON p.id=x.payment_id AND p.tenant_id=x.tenant_id
                WHERE x.company_id IS NULL OR p.id IS NULL
                   OR x.company_id IS DISTINCT FROM p.company_id
            ""","billing_receipts")

class Migration(migrations.Migration):
    dependencies=[("billing","0003_invoiceitem_company_paymentallocation_company_and_more"),("sales","0003_company_scope_finalize")]
    operations=[
        migrations.RunPython(backfill,migrations.RunPython.noop),
        migrations.AlterField(model_name="invoiceitem",name="company",field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="invoice_items_company_scope",to="companies.company")),
        migrations.AlterField(model_name="receivable",name="company",field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="receivables_company_scope",to="companies.company")),
        migrations.AlterField(model_name="paymentallocation",name="company",field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="payment_allocations_company_scope",to="companies.company")),
        migrations.AlterField(model_name="receipt",name="company",field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="receipts_company_scope",to="companies.company")),
        migrations.RunSQL(sql=r"""CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_tenant_id_ref
    ON companies_companies (tenant_id, id);
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname='fk_invoice_item_tenant_company'
        AND conrelid='billing_invoice_items'::regclass
  ) THEN
    ALTER TABLE billing_invoice_items
      ADD CONSTRAINT fk_invoice_item_tenant_company
      FOREIGN KEY (tenant_id, company_id)
      REFERENCES companies_companies(tenant_id, id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;
""",reverse_sql="ALTER TABLE billing_invoice_items DROP CONSTRAINT IF EXISTS fk_invoice_item_tenant_company;"),
        migrations.RunSQL(sql=r"""CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_tenant_id_ref
    ON companies_companies (tenant_id, id);
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname='fk_receivable_tenant_company'
        AND conrelid='billing_receivables'::regclass
  ) THEN
    ALTER TABLE billing_receivables
      ADD CONSTRAINT fk_receivable_tenant_company
      FOREIGN KEY (tenant_id, company_id)
      REFERENCES companies_companies(tenant_id, id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;
""",reverse_sql="ALTER TABLE billing_receivables DROP CONSTRAINT IF EXISTS fk_receivable_tenant_company;"),
        migrations.RunSQL(sql=r"""CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_tenant_id_ref
    ON companies_companies (tenant_id, id);
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname='fk_payment_alloc_tenant_company'
        AND conrelid='billing_payment_allocations'::regclass
  ) THEN
    ALTER TABLE billing_payment_allocations
      ADD CONSTRAINT fk_payment_alloc_tenant_company
      FOREIGN KEY (tenant_id, company_id)
      REFERENCES companies_companies(tenant_id, id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;
""",reverse_sql="ALTER TABLE billing_payment_allocations DROP CONSTRAINT IF EXISTS fk_payment_alloc_tenant_company;"),
        migrations.RunSQL(sql=r"""CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_tenant_id_ref
    ON companies_companies (tenant_id, id);
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname='fk_receipt_tenant_company'
        AND conrelid='billing_receipts'::regclass
  ) THEN
    ALTER TABLE billing_receipts
      ADD CONSTRAINT fk_receipt_tenant_company
      FOREIGN KEY (tenant_id, company_id)
      REFERENCES companies_companies(tenant_id, id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;
""",reverse_sql="ALTER TABLE billing_receipts DROP CONSTRAINT IF EXISTS fk_receipt_tenant_company;"),
        migrations.RunSQL(sql=r"""
CREATE OR REPLACE FUNCTION hq_scope_invoice_item_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected uuid; other uuid;
BEGIN
  SELECT company_id INTO expected FROM billing_invoices
  WHERE id=NEW.invoice_id AND tenant_id=NEW.tenant_id;
  IF expected IS NULL THEN RAISE EXCEPTION 'invoice company cannot be resolved'; END IF;
  IF NEW.sale_item_id IS NOT NULL THEN
    SELECT company_id INTO other FROM sales_sale_items
    WHERE id=NEW.sale_item_id AND tenant_id=NEW.tenant_id;
    IF other IS NULL OR other<>expected THEN RAISE EXCEPTION 'invoice item sale item company mismatch'; END IF;
  END IF;
  IF NEW.company_id IS NULL THEN NEW.company_id:=expected;
  ELSIF NEW.company_id<>expected THEN RAISE EXCEPTION 'invoice item company mismatch'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS hq_scope_invoice_item_trg ON billing_invoice_items;
CREATE TRIGGER hq_scope_invoice_item_trg
BEFORE INSERT OR UPDATE ON billing_invoice_items
FOR EACH ROW EXECUTE FUNCTION hq_scope_invoice_item_fn();

CREATE OR REPLACE FUNCTION hq_scope_receivable_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected uuid; other uuid;
BEGIN
  SELECT company_id INTO expected FROM billing_invoices
  WHERE id=NEW.invoice_id AND tenant_id=NEW.tenant_id;
  SELECT company_id INTO other FROM customers_customers
  WHERE id=NEW.customer_id AND tenant_id=NEW.tenant_id;
  IF expected IS NULL OR other IS NULL OR other<>expected THEN
    RAISE EXCEPTION 'receivable parent company mismatch';
  END IF;
  IF NEW.company_id IS NULL THEN NEW.company_id:=expected;
  ELSIF NEW.company_id<>expected THEN RAISE EXCEPTION 'receivable company mismatch'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS hq_scope_receivable_trg ON billing_receivables;
CREATE TRIGGER hq_scope_receivable_trg
BEFORE INSERT OR UPDATE ON billing_receivables
FOR EACH ROW EXECUTE FUNCTION hq_scope_receivable_fn();

CREATE OR REPLACE FUNCTION hq_scope_payment_alloc_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected uuid; other uuid;
BEGIN
  SELECT company_id INTO expected FROM billing_payments
  WHERE id=NEW.payment_id AND tenant_id=NEW.tenant_id;
  SELECT company_id INTO other FROM billing_receivables
  WHERE id=NEW.receivable_id AND tenant_id=NEW.tenant_id;
  IF expected IS NULL OR other IS NULL OR other<>expected THEN
    RAISE EXCEPTION 'payment allocation parent company mismatch';
  END IF;
  IF NEW.company_id IS NULL THEN NEW.company_id:=expected;
  ELSIF NEW.company_id<>expected THEN RAISE EXCEPTION 'payment allocation company mismatch'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS hq_scope_payment_alloc_trg ON billing_payment_allocations;
CREATE TRIGGER hq_scope_payment_alloc_trg
BEFORE INSERT OR UPDATE ON billing_payment_allocations
FOR EACH ROW EXECUTE FUNCTION hq_scope_payment_alloc_fn();

CREATE OR REPLACE FUNCTION hq_scope_receipt_fn()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected uuid;
BEGIN
  SELECT company_id INTO expected FROM billing_payments
  WHERE id=NEW.payment_id AND tenant_id=NEW.tenant_id;
  IF expected IS NULL THEN RAISE EXCEPTION 'payment company cannot be resolved'; END IF;
  IF NEW.company_id IS NULL THEN NEW.company_id:=expected;
  ELSIF NEW.company_id<>expected THEN RAISE EXCEPTION 'receipt company mismatch'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS hq_scope_receipt_trg ON billing_receipts;
CREATE TRIGGER hq_scope_receipt_trg
BEFORE INSERT OR UPDATE ON billing_receipts
FOR EACH ROW EXECUTE FUNCTION hq_scope_receipt_fn();
""",reverse_sql=r"""
            DROP TRIGGER IF EXISTS hq_scope_invoice_item_trg ON billing_invoice_items;
            DROP TRIGGER IF EXISTS hq_scope_receivable_trg ON billing_receivables;
            DROP TRIGGER IF EXISTS hq_scope_payment_alloc_trg ON billing_payment_allocations;
            DROP TRIGGER IF EXISTS hq_scope_receipt_trg ON billing_receipts;
            DROP FUNCTION IF EXISTS hq_scope_invoice_item_fn();
            DROP FUNCTION IF EXISTS hq_scope_receivable_fn();
            DROP FUNCTION IF EXISTS hq_scope_payment_alloc_fn();
            DROP FUNCTION IF EXISTS hq_scope_receipt_fn();
        """),
    ]
