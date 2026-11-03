from django.db import migrations

FORWARD_SQL = r"""
ALTER TABLE "departments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "departments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "departments";
CREATE POLICY tenant_company_isolation ON "departments" FOR ALL TO PUBLIC USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid AND company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid AND company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);
ALTER TABLE "positions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "positions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_company_isolation ON "positions";
CREATE POLICY tenant_company_isolation ON "positions" FOR ALL TO PUBLIC USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid AND company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid AND company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_tenant_company_id
ON companies_companies(tenant_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_departments_tenant_company_id
ON departments(tenant_id, company_id, id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_security_event_tenant_company') THEN
    ALTER TABLE security_events
      ADD CONSTRAINT fk_security_event_tenant_company
      FOREIGN KEY (tenant_id, company_id)
      REFERENCES companies_companies(tenant_id, id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_setting_tenant_company') THEN
    ALTER TABLE settings
      ADD CONSTRAINT fk_setting_tenant_company
      FOREIGN KEY (tenant_id, company_id)
      REFERENCES companies_companies(tenant_id, id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_sethist_tenant_company') THEN
    ALTER TABLE setting_histories
      ADD CONSTRAINT fk_sethist_tenant_company
      FOREIGN KEY (tenant_id, company_id)
      REFERENCES companies_companies(tenant_id, id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_modset_tenant_company') THEN
    ALTER TABLE module_settings
      ADD CONSTRAINT fk_modset_tenant_company
      FOREIGN KEY (tenant_id, company_id)
      REFERENCES companies_companies(tenant_id, id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_locent_tenant_company') THEN
    ALTER TABLE localized_entities
      ADD CONSTRAINT fk_locent_tenant_company
      FOREIGN KEY (tenant_id, company_id)
      REFERENCES companies_companies(tenant_id, id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_department_tenant_company') THEN
    ALTER TABLE departments
      ADD CONSTRAINT fk_department_tenant_company
      FOREIGN KEY (tenant_id, company_id)
      REFERENCES companies_companies(tenant_id, id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_position_tenant_company') THEN
    ALTER TABLE positions
      ADD CONSTRAINT fk_position_tenant_company
      FOREIGN KEY (tenant_id, company_id)
      REFERENCES companies_companies(tenant_id, id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_position_tenant_company_department') THEN
    ALTER TABLE positions
      ADD CONSTRAINT fk_position_tenant_company_department
      FOREIGN KEY (tenant_id, company_id, department_id)
      REFERENCES departments(tenant_id, company_id, id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

"""

class Migration(migrations.Migration):
    dependencies = [
        ("hr", "0001_initial"),
        ("governance", "0002_scope_rls"),
        ("localization", "0002_scope_rls"),
    ]

    operations = [
        migrations.RunSQL(FORWARD_SQL, reverse_sql=migrations.RunSQL.noop),
    ]
