from django.db import migrations


FORWARD_SQL = r"""
ALTER TABLE partners_partners
  ADD CONSTRAINT fk_partner_tenant_company
  FOREIGN KEY (tenant_id, company_id)
  REFERENCES companies_companies (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE partners_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners_partners FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON partners_partners;
CREATE POLICY tenant_isolation ON partners_partners
USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
"""

REVERSE_SQL = r"""
DROP POLICY IF EXISTS tenant_isolation ON partners_partners;
ALTER TABLE partners_partners NO FORCE ROW LEVEL SECURITY;
ALTER TABLE partners_partners DISABLE ROW LEVEL SECURITY;
ALTER TABLE partners_partners DROP CONSTRAINT IF EXISTS fk_partner_tenant_company;
"""


class Migration(migrations.Migration):
    dependencies = [
        ("partners", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(FORWARD_SQL, REVERSE_SQL),
    ]
