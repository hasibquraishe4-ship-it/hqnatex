from django.db import migrations


FORWARD_SQL = r"""
ALTER TABLE branches_branches
  ADD CONSTRAINT fk_branch_tenant_company
  FOREIGN KEY (tenant_id, company_id)
  REFERENCES companies_companies (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE agencies_agencies
  ADD CONSTRAINT fk_agency_tenant_company
  FOREIGN KEY (tenant_id, company_id)
  REFERENCES companies_companies (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE agencies_agencies
  ADD CONSTRAINT fk_agency_tenant_branch
  FOREIGN KEY (tenant_id, branch_id)
  REFERENCES branches_branches (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE iam_role_permissions
  ADD CONSTRAINT fk_role_permission_tenant_role
  FOREIGN KEY (tenant_id, role_id)
  REFERENCES iam_roles (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE iam_membership_roles
  ADD CONSTRAINT fk_membership_role_tenant_membership
  FOREIGN KEY (tenant_id, membership_id)
  REFERENCES iam_tenant_memberships (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE iam_membership_roles
  ADD CONSTRAINT fk_membership_role_tenant_role
  FOREIGN KEY (tenant_id, role_id)
  REFERENCES iam_roles (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'companies_companies',
    'branches_branches',
    'agencies_agencies',
    'iam_tenant_memberships',
    'iam_roles',
    'iam_role_permissions',
    'iam_membership_roles',
    'audit_logs'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid)',
      t
    );
  END LOOP;
END $$;
"""

REVERSE_SQL = r"""
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'companies_companies',
    'branches_branches',
    'agencies_agencies',
    'iam_tenant_memberships',
    'iam_roles',
    'iam_role_permissions',
    'iam_membership_roles',
    'audit_logs'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format('ALTER TABLE %I NO FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

ALTER TABLE iam_membership_roles DROP CONSTRAINT IF EXISTS fk_membership_role_tenant_role;
ALTER TABLE iam_membership_roles DROP CONSTRAINT IF EXISTS fk_membership_role_tenant_membership;
ALTER TABLE iam_role_permissions DROP CONSTRAINT IF EXISTS fk_role_permission_tenant_role;
ALTER TABLE agencies_agencies DROP CONSTRAINT IF EXISTS fk_agency_tenant_branch;
ALTER TABLE agencies_agencies DROP CONSTRAINT IF EXISTS fk_agency_tenant_company;
ALTER TABLE branches_branches DROP CONSTRAINT IF EXISTS fk_branch_tenant_company;
"""


class Migration(migrations.Migration):
    dependencies = [
        ("tenancy", "0001_initial"),
        ("companies", "0001_initial"),
        ("branches", "0001_initial"),
        ("agencies", "0001_initial"),
        ("iam", "0001_initial"),
        ("audit", "0001_initial"),
    ]

    operations = [migrations.RunSQL(FORWARD_SQL, REVERSE_SQL)]
