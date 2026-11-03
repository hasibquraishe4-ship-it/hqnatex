from django.db import migrations

FORWARD_SQL = """
ALTER TABLE "catalog_service_technical_profiles"
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE "catalog_service_technical_profiles"
    FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation
    ON "catalog_service_technical_profiles";

CREATE POLICY tenant_isolation
    ON "catalog_service_technical_profiles"
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
    )
    WITH CHECK (
        tenant_id = NULLIF(
            current_setting(
                'app.current_tenant_id',
                true
            ),
            ''
        )::uuid
    );

ALTER TABLE "catalog_service_technical_profiles"
    OWNER TO hqnatex_core;
"""

REVERSE_SQL = """
DROP POLICY IF EXISTS tenant_isolation
    ON "catalog_service_technical_profiles";

ALTER TABLE "catalog_service_technical_profiles"
    NO FORCE ROW LEVEL SECURITY;

ALTER TABLE "catalog_service_technical_profiles"
    DISABLE ROW LEVEL SECURITY;
"""


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0004_servicetechnicalprofile_and_more"),
    ]

    operations = [
        migrations.RunSQL(
            FORWARD_SQL,
            reverse_sql=REVERSE_SQL,
        ),
    ]
