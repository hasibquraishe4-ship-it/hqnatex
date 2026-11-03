from django.db import migrations


FORWARD_SQL = r"""
ALTER TABLE "tax_adjustments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tax_adjustments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "tax_adjustments";
CREATE POLICY tenant_company_isolation
ON "tax_adjustments"
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

ALTER TABLE "tax_declaration_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tax_declaration_lines" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "tax_declaration_lines";
CREATE POLICY tenant_company_isolation
ON "tax_declaration_lines"
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

ALTER TABLE "tax_declarations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tax_declarations" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "tax_declarations";
CREATE POLICY tenant_company_isolation
ON "tax_declarations"
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

ALTER TABLE "tax_liabilities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tax_liabilities" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "tax_liabilities";
CREATE POLICY tenant_company_isolation
ON "tax_liabilities"
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

ALTER TABLE "tax_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tax_payments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "tax_payments";
CREATE POLICY tenant_company_isolation
ON "tax_payments"
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

ALTER TABLE "tax_rule_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tax_rule_versions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "tax_rule_versions";
CREATE POLICY tenant_company_isolation
ON "tax_rule_versions"
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

ALTER TABLE "tax_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tax_rules" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "tax_rules";
CREATE POLICY tenant_company_isolation
ON "tax_rules"
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
DROP POLICY IF EXISTS tenant_company_isolation ON "tax_rules";
ALTER TABLE "tax_rules" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "tax_rules" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_company_isolation ON "tax_rule_versions";
ALTER TABLE "tax_rule_versions" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "tax_rule_versions" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_company_isolation ON "tax_payments";
ALTER TABLE "tax_payments" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "tax_payments" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_company_isolation ON "tax_liabilities";
ALTER TABLE "tax_liabilities" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "tax_liabilities" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_company_isolation ON "tax_declarations";
ALTER TABLE "tax_declarations" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "tax_declarations" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_company_isolation ON "tax_declaration_lines";
ALTER TABLE "tax_declaration_lines" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "tax_declaration_lines" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_company_isolation ON "tax_adjustments";
ALTER TABLE "tax_adjustments" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "tax_adjustments" DISABLE ROW LEVEL SECURITY;
"""


class Migration(migrations.Migration):

    dependencies = [
        ("taxation", "0002_taxadjustment_taxdeclaration_taxdeclarationline_and_more"),
    ]

    operations = [
        migrations.RunSQL(
            FORWARD_SQL,
            reverse_sql=REVERSE_SQL,
        ),
    ]
