from django.db import migrations


TABLES = (
    "noc_network_resources",
    "noc_customer_service_resources",
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
        ("noc", "0004_company_scope_finalize"),
        ("customers", "0004_company_scope_rls"),
    ]

    operations = [
        migrations.RunSQL(
            FORWARD_SQL,
            reverse_sql=REVERSE_SQL,
        ),
    ]
