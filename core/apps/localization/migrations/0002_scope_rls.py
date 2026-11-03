from django.db import migrations

FORWARD_SQL = r"""
ALTER TABLE "localized_entities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "localized_entities" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "localized_entities";
CREATE POLICY tenant_company_isolation ON "localized_entities" FOR ALL TO PUBLIC USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid AND (company_id IS NULL OR company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid)) WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid AND (company_id IS NULL OR company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid));
"""

class Migration(migrations.Migration):
    dependencies = [
        ("localization", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(FORWARD_SQL, reverse_sql=migrations.RunSQL.noop),
    ]
