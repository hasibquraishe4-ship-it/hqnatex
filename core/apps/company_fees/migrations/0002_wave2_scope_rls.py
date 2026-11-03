from django.db import migrations


FORWARD_SQL = r"""
ALTER TABLE "fee_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fee_types" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "fee_types";
CREATE POLICY tenant_company_isolation
ON "fee_types"
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
DROP POLICY IF EXISTS tenant_company_isolation ON "fee_types";
ALTER TABLE "fee_types" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "fee_types" DISABLE ROW LEVEL SECURITY;
"""


class Migration(migrations.Migration):

    dependencies = [
        ("company_fees", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(
            FORWARD_SQL,
            reverse_sql=REVERSE_SQL,
        ),
    ]
