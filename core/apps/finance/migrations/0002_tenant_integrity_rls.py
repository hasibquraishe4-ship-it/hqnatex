from django.db import migrations


FORWARD_SQL = r"""
ALTER TABLE finance_accounts
  ADD CONSTRAINT fk_account_tenant_company
  FOREIGN KEY (tenant_id, company_id)
  REFERENCES companies_companies (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE finance_accounts
  ADD CONSTRAINT fk_account_tenant_parent
  FOREIGN KEY (tenant_id, parent_id)
  REFERENCES finance_accounts (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE finance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_accounts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON finance_accounts;
CREATE POLICY tenant_isolation ON finance_accounts
USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
"""

REVERSE_SQL = r"""
DROP POLICY IF EXISTS tenant_isolation ON finance_accounts;
ALTER TABLE finance_accounts NO FORCE ROW LEVEL SECURITY;
ALTER TABLE finance_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE finance_accounts DROP CONSTRAINT IF EXISTS fk_account_tenant_parent;
ALTER TABLE finance_accounts DROP CONSTRAINT IF EXISTS fk_account_tenant_company;
"""


class Migration(migrations.Migration):
    dependencies = [
        ("finance", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(FORWARD_SQL, REVERSE_SQL),
    ]
