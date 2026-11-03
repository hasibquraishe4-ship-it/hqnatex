from django.db import migrations


FORWARD_SQL = r"""
ALTER TABLE "budget_commitments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "budget_commitments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "budget_commitments";
CREATE POLICY tenant_company_isolation
ON "budget_commitments"
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

ALTER TABLE "budget_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "budget_lines" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "budget_lines";
CREATE POLICY tenant_company_isolation
ON "budget_lines"
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

ALTER TABLE "budget_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "budget_versions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "budget_versions";
CREATE POLICY tenant_company_isolation
ON "budget_versions"
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

ALTER TABLE "budgets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "budgets" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "budgets";
CREATE POLICY tenant_company_isolation
ON "budgets"
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

ALTER TABLE "expense_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expense_categories" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "expense_categories";
CREATE POLICY tenant_company_isolation
ON "expense_categories"
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

ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expenses" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "expenses";
CREATE POLICY tenant_company_isolation
ON "expenses"
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
DROP POLICY IF EXISTS tenant_company_isolation ON "expenses";
ALTER TABLE "expenses" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "expenses" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_company_isolation ON "expense_categories";
ALTER TABLE "expense_categories" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "expense_categories" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_company_isolation ON "budgets";
ALTER TABLE "budgets" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "budgets" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_company_isolation ON "budget_versions";
ALTER TABLE "budget_versions" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "budget_versions" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_company_isolation ON "budget_lines";
ALTER TABLE "budget_lines" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "budget_lines" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_company_isolation ON "budget_commitments";
ALTER TABLE "budget_commitments" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "budget_commitments" DISABLE ROW LEVEL SECURITY;
"""


class Migration(migrations.Migration):

    dependencies = [
        ("expenses", "0002_budget_budgetcommitment_budgetline_budgetversion"),
    ]

    operations = [
        migrations.RunSQL(
            FORWARD_SQL,
            reverse_sql=REVERSE_SQL,
        ),
    ]
