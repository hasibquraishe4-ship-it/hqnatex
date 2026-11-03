from django.db import migrations


TABLES = (
    "customers_customers",
    "customers_customer_services",
    "customers_service_status_history",
    "customers_service_package_history",
    "customers_service_change_requests",
)


def _strict_company_policy(table):
    return f"""
ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
ALTER TABLE {table} FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON {table};
DROP POLICY IF EXISTS tenant_company_isolation ON {table};

CREATE POLICY tenant_company_isolation
ON {table}
FOR ALL TO PUBLIC
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


def _tenant_policy(table):
    return f"""
ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
ALTER TABLE {table} FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_company_isolation ON {table};
DROP POLICY IF EXISTS tenant_isolation ON {table};

CREATE POLICY tenant_isolation
ON {table}
FOR ALL TO PUBLIC
USING (
    tenant_id = NULLIF(
        current_setting('app.current_tenant_id', true),
        ''
    )::uuid
)
WITH CHECK (
    tenant_id = NULLIF(
        current_setting('app.current_tenant_id', true),
        ''
    )::uuid
);
"""


FORWARD_SQL = "\n".join(
    _strict_company_policy(table)
    for table in TABLES
)

REVERSE_SQL = "\n".join(
    _tenant_policy(table)
    for table in TABLES
)


class Migration(migrations.Migration):
    dependencies = [
        ("customers", "0003_company_scope_finalize"),
    ]

    operations = [
        migrations.RunSQL(
            FORWARD_SQL,
            reverse_sql=REVERSE_SQL,
        ),
    ]
