from django.db import migrations


FORWARD_SQL = r"""
ALTER TABLE customers_customer_service_technical_values
ENABLE ROW LEVEL SECURITY;

ALTER TABLE customers_customer_service_technical_values
FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation
ON customers_customer_service_technical_values;

DROP POLICY IF EXISTS tenant_company_isolation
ON customers_customer_service_technical_values;

CREATE POLICY tenant_company_isolation
ON customers_customer_service_technical_values
FOR ALL
TO PUBLIC
USING (
    tenant_id = NULLIF(
        current_setting(
            'app.current_tenant_id',
            true
        ),
        ''
    )::uuid
    AND
    company_id = NULLIF(
        current_setting(
            'app.current_company_id',
            true
        ),
        ''
    )::uuid
)
WITH CHECK (
    tenant_id = NULLIF(
        current_setting(
            'app.current_tenant_id',
            true
        ),
        ''
    )::uuid
    AND
    company_id = NULLIF(
        current_setting(
            'app.current_company_id',
            true
        ),
        ''
    )::uuid
);
"""


REVERSE_SQL = r"""
DROP POLICY IF EXISTS tenant_company_isolation
ON customers_customer_service_technical_values;

DROP POLICY IF EXISTS tenant_isolation
ON customers_customer_service_technical_values;

ALTER TABLE customers_customer_service_technical_values
NO FORCE ROW LEVEL SECURITY;

ALTER TABLE customers_customer_service_technical_values
DISABLE ROW LEVEL SECURITY;
"""


class Migration(migrations.Migration):

    dependencies = [
        (
            "customers",
            "0007_customer_technical_integrity_rls_backfill",
        ),
    ]

    operations = [
        migrations.RunSQL(
            FORWARD_SQL,
            reverse_sql=REVERSE_SQL,
        ),
    ]
