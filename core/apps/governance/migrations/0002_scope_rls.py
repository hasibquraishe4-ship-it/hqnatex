from django.db import migrations

FORWARD_SQL = r"""
ALTER TABLE "security_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "security_events" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "security_events";
CREATE POLICY tenant_company_isolation ON "security_events" FOR ALL TO PUBLIC USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid AND (company_id IS NULL OR company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid)) WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid AND (company_id IS NULL OR company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid));
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "settings" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "settings";
CREATE POLICY tenant_company_isolation ON "settings" FOR ALL TO PUBLIC USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid AND (company_id IS NULL OR company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid)) WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid AND (company_id IS NULL OR company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid));
ALTER TABLE "setting_histories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "setting_histories" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "setting_histories";
CREATE POLICY tenant_company_isolation ON "setting_histories" FOR ALL TO PUBLIC USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid AND (company_id IS NULL OR company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid)) WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid AND (company_id IS NULL OR company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid));
ALTER TABLE "module_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "module_settings" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "module_settings";
CREATE POLICY tenant_company_isolation ON "module_settings" FOR ALL TO PUBLIC USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid AND (company_id IS NULL OR company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid)) WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid AND (company_id IS NULL OR company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid));
"""

class Migration(migrations.Migration):
    dependencies = [
        ("governance", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(FORWARD_SQL, reverse_sql=migrations.RunSQL.noop),
    ]
