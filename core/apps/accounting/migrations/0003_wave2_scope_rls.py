from django.db import migrations


FORWARD_SQL = r"""
ALTER TABLE "accounting_period_locks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accounting_period_locks" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "accounting_period_locks";
CREATE POLICY tenant_company_isolation
ON "accounting_period_locks"
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

ALTER TABLE "accounting_periods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accounting_periods" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "accounting_periods";
CREATE POLICY tenant_company_isolation
ON "accounting_periods"
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

ALTER TABLE "accounting_posting_rule_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accounting_posting_rule_lines" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "accounting_posting_rule_lines";
CREATE POLICY tenant_company_isolation
ON "accounting_posting_rule_lines"
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

ALTER TABLE "accounting_posting_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accounting_posting_rules" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "accounting_posting_rules";
CREATE POLICY tenant_company_isolation
ON "accounting_posting_rules"
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

ALTER TABLE "cost_centers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cost_centers" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "cost_centers";
CREATE POLICY tenant_company_isolation
ON "cost_centers"
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

ALTER TABLE "journal_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "journal_entries" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "journal_entries";
CREATE POLICY tenant_company_isolation
ON "journal_entries"
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

ALTER TABLE "journal_entry_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "journal_entry_lines" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "journal_entry_lines";
CREATE POLICY tenant_company_isolation
ON "journal_entry_lines"
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

ALTER TABLE "opening_balances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "opening_balances" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "opening_balances";
CREATE POLICY tenant_company_isolation
ON "opening_balances"
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
DROP POLICY IF EXISTS tenant_company_isolation ON "opening_balances";
ALTER TABLE "opening_balances" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "opening_balances" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_company_isolation ON "journal_entry_lines";
ALTER TABLE "journal_entry_lines" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "journal_entry_lines" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_company_isolation ON "journal_entries";
ALTER TABLE "journal_entries" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "journal_entries" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_company_isolation ON "cost_centers";
ALTER TABLE "cost_centers" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "cost_centers" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_company_isolation ON "accounting_posting_rules";
ALTER TABLE "accounting_posting_rules" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "accounting_posting_rules" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_company_isolation ON "accounting_posting_rule_lines";
ALTER TABLE "accounting_posting_rule_lines" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "accounting_posting_rule_lines" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_company_isolation ON "accounting_periods";
ALTER TABLE "accounting_periods" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "accounting_periods" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_company_isolation ON "accounting_period_locks";
ALTER TABLE "accounting_period_locks" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "accounting_period_locks" DISABLE ROW LEVEL SECURITY;
"""


class Migration(migrations.Migration):

    dependencies = [
        ("accounting", "0002_accountingperiodlock_accountingpostingrule_and_more"),
    ]

    operations = [
        migrations.RunSQL(
            FORWARD_SQL,
            reverse_sql=REVERSE_SQL,
        ),
    ]
