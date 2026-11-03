from django.db import migrations


FORWARD_SQL = r"""
ALTER TABLE "credit_note_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "credit_note_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "credit_note_items";
CREATE POLICY tenant_company_isolation
ON "credit_note_items"
FOR ALL
TO PUBLIC
USING (
    tenant_id = NULLIF(
        current_setting('app.current_tenant_id', true),
        ''
    )::uuid
    AND
    company_id = NULLIF(
        current_setting('app.current_company_id', true),
        ''
    )::uuid
)
WITH CHECK (
    tenant_id = NULLIF(
        current_setting('app.current_tenant_id', true),
        ''
    )::uuid
    AND
    company_id = NULLIF(
        current_setting('app.current_company_id', true),
        ''
    )::uuid
);

ALTER TABLE "credit_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "credit_notes" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "credit_notes";
CREATE POLICY tenant_company_isolation
ON "credit_notes"
FOR ALL
TO PUBLIC
USING (
    tenant_id = NULLIF(
        current_setting('app.current_tenant_id', true),
        ''
    )::uuid
    AND
    company_id = NULLIF(
        current_setting('app.current_company_id', true),
        ''
    )::uuid
)
WITH CHECK (
    tenant_id = NULLIF(
        current_setting('app.current_tenant_id', true),
        ''
    )::uuid
    AND
    company_id = NULLIF(
        current_setting('app.current_company_id', true),
        ''
    )::uuid
);

ALTER TABLE "debit_note_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "debit_note_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "debit_note_items";
CREATE POLICY tenant_company_isolation
ON "debit_note_items"
FOR ALL
TO PUBLIC
USING (
    tenant_id = NULLIF(
        current_setting('app.current_tenant_id', true),
        ''
    )::uuid
    AND
    company_id = NULLIF(
        current_setting('app.current_company_id', true),
        ''
    )::uuid
)
WITH CHECK (
    tenant_id = NULLIF(
        current_setting('app.current_tenant_id', true),
        ''
    )::uuid
    AND
    company_id = NULLIF(
        current_setting('app.current_company_id', true),
        ''
    )::uuid
);

ALTER TABLE "debit_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "debit_notes" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "debit_notes";
CREATE POLICY tenant_company_isolation
ON "debit_notes"
FOR ALL
TO PUBLIC
USING (
    tenant_id = NULLIF(
        current_setting('app.current_tenant_id', true),
        ''
    )::uuid
    AND
    company_id = NULLIF(
        current_setting('app.current_company_id', true),
        ''
    )::uuid
)
WITH CHECK (
    tenant_id = NULLIF(
        current_setting('app.current_tenant_id', true),
        ''
    )::uuid
    AND
    company_id = NULLIF(
        current_setting('app.current_company_id', true),
        ''
    )::uuid
);
"""


REVERSE_SQL = r"""
DROP POLICY IF EXISTS tenant_company_isolation ON "debit_notes";
ALTER TABLE "debit_notes" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "debit_notes" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_company_isolation ON "debit_note_items";
ALTER TABLE "debit_note_items" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "debit_note_items" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_company_isolation ON "credit_notes";
ALTER TABLE "credit_notes" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "credit_notes" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_company_isolation ON "credit_note_items";
ALTER TABLE "credit_note_items" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "credit_note_items" DISABLE ROW LEVEL SECURITY;
"""


class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0005_creditnote_creditnoteitem_debitnote_debitnoteitem"),
    ]

    operations = [
        migrations.RunSQL(
            FORWARD_SQL,
            reverse_sql=REVERSE_SQL,
        ),
    ]
