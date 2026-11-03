from django.db import migrations


FORWARD_SQL = r"""
ALTER TABLE "bank_reconciliation_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bank_reconciliation_lines" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "bank_reconciliation_lines";
CREATE POLICY tenant_company_isolation
ON "bank_reconciliation_lines"
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

ALTER TABLE "bank_reconciliations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bank_reconciliations" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "bank_reconciliations";
CREATE POLICY tenant_company_isolation
ON "bank_reconciliations"
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

ALTER TABLE "bank_statement_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bank_statement_lines" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "bank_statement_lines";
CREATE POLICY tenant_company_isolation
ON "bank_statement_lines"
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

ALTER TABLE "bank_statements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bank_statements" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "bank_statements";
CREATE POLICY tenant_company_isolation
ON "bank_statements"
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

ALTER TABLE "cash_bank_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cash_bank_accounts" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "cash_bank_accounts";
CREATE POLICY tenant_company_isolation
ON "cash_bank_accounts"
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

ALTER TABLE "cash_bank_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cash_bank_transactions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "cash_bank_transactions";
CREATE POLICY tenant_company_isolation
ON "cash_bank_transactions"
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

ALTER TABLE "payment_methods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_methods" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "payment_methods";
CREATE POLICY tenant_company_isolation
ON "payment_methods"
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

ALTER TABLE "refunds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "refunds" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "refunds";
CREATE POLICY tenant_company_isolation
ON "refunds"
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
DROP POLICY IF EXISTS tenant_company_isolation ON "refunds";
ALTER TABLE "refunds" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "refunds" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_company_isolation ON "payment_methods";
ALTER TABLE "payment_methods" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "payment_methods" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_company_isolation ON "cash_bank_transactions";
ALTER TABLE "cash_bank_transactions" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "cash_bank_transactions" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_company_isolation ON "cash_bank_accounts";
ALTER TABLE "cash_bank_accounts" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "cash_bank_accounts" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_company_isolation ON "bank_statements";
ALTER TABLE "bank_statements" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "bank_statements" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_company_isolation ON "bank_statement_lines";
ALTER TABLE "bank_statement_lines" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "bank_statement_lines" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_company_isolation ON "bank_reconciliations";
ALTER TABLE "bank_reconciliations" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "bank_reconciliations" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_company_isolation ON "bank_reconciliation_lines";
ALTER TABLE "bank_reconciliation_lines" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "bank_reconciliation_lines" DISABLE ROW LEVEL SECURITY;
"""


class Migration(migrations.Migration):

    dependencies = [
        ("treasury", "0002_bankreconciliation_bankreconciliationline_and_more"),
    ]

    operations = [
        migrations.RunSQL(
            FORWARD_SQL,
            reverse_sql=REVERSE_SQL,
        ),
    ]
