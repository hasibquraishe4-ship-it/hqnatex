from django.db import migrations


FORWARD_SQL = r"""
ALTER TABLE catalog_services
  ADD CONSTRAINT fk_catalog_service_tenant_category
  FOREIGN KEY (tenant_id, category_id)
  REFERENCES catalog_service_categories (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE catalog_service_technical_fields
  ADD CONSTRAINT fk_technical_field_tenant_service
  FOREIGN KEY (tenant_id, service_id)
  REFERENCES catalog_services (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE catalog_packages
  ADD CONSTRAINT fk_package_tenant_service
  FOREIGN KEY (tenant_id, service_id)
  REFERENCES catalog_services (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE catalog_package_prices
  ADD CONSTRAINT fk_package_price_tenant_package
  FOREIGN KEY (tenant_id, package_id)
  REFERENCES catalog_packages (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE customers_customers
  ADD CONSTRAINT fk_customer_tenant_company
  FOREIGN KEY (tenant_id, company_id)
  REFERENCES companies_companies (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE customers_customers
  ADD CONSTRAINT fk_customer_tenant_branch
  FOREIGN KEY (tenant_id, branch_id)
  REFERENCES branches_branches (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE customers_customers
  ADD CONSTRAINT fk_customer_tenant_agency
  FOREIGN KEY (tenant_id, agency_id)
  REFERENCES agencies_agencies (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE customers_customer_services
  ADD CONSTRAINT fk_customer_service_tenant_customer
  FOREIGN KEY (tenant_id, customer_id)
  REFERENCES customers_customers (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE customers_customer_services
  ADD CONSTRAINT fk_customer_service_tenant_service
  FOREIGN KEY (tenant_id, service_id)
  REFERENCES catalog_services (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE customers_customer_services
  ADD CONSTRAINT fk_customer_service_tenant_package_service
  FOREIGN KEY (tenant_id, package_id, service_id)
  REFERENCES catalog_packages (tenant_id, id, service_id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE customers_customer_services
  ADD CONSTRAINT fk_customer_service_tenant_branch
  FOREIGN KEY (tenant_id, branch_id)
  REFERENCES branches_branches (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE customers_customer_services
  ADD CONSTRAINT fk_customer_service_tenant_agency
  FOREIGN KEY (tenant_id, agency_id)
  REFERENCES agencies_agencies (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE customers_service_package_history
  ADD CONSTRAINT fk_package_history_tenant_customer_service
  FOREIGN KEY (tenant_id, customer_service_id)
  REFERENCES customers_customer_services (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE customers_service_package_history
  ADD CONSTRAINT fk_package_history_tenant_old_package
  FOREIGN KEY (tenant_id, old_package_id)
  REFERENCES catalog_packages (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE customers_service_package_history
  ADD CONSTRAINT fk_package_history_tenant_new_package
  FOREIGN KEY (tenant_id, new_package_id)
  REFERENCES catalog_packages (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE customers_service_status_history
  ADD CONSTRAINT fk_status_history_tenant_customer_service
  FOREIGN KEY (tenant_id, customer_service_id)
  REFERENCES customers_customer_services (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE customers_service_change_requests
  ADD CONSTRAINT fk_change_request_tenant_customer_service
  FOREIGN KEY (tenant_id, customer_service_id)
  REFERENCES customers_customer_services (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE noc_network_resources
  ADD CONSTRAINT fk_noc_resource_tenant_branch
  FOREIGN KEY (tenant_id, branch_id)
  REFERENCES branches_branches (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE noc_network_resources
  ADD CONSTRAINT fk_noc_resource_tenant_parent
  FOREIGN KEY (tenant_id, parent_id)
  REFERENCES noc_network_resources (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE noc_customer_service_resources
  ADD CONSTRAINT fk_noc_assignment_tenant_customer_service
  FOREIGN KEY (tenant_id, customer_service_id)
  REFERENCES customers_customer_services (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE noc_customer_service_resources
  ADD CONSTRAINT fk_noc_assignment_tenant_resource
  FOREIGN KEY (tenant_id, resource_id)
  REFERENCES noc_network_resources (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'catalog_service_categories',
    'catalog_services',
    'catalog_service_technical_fields',
    'catalog_packages',
    'catalog_package_prices',
    'customers_customers',
    'customers_customer_services',
    'customers_service_package_history',
    'customers_service_status_history',
    'customers_service_change_requests',
    'noc_network_resources',
    'noc_customer_service_resources'
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
    'catalog_service_categories','catalog_services','catalog_service_technical_fields','catalog_packages','catalog_package_prices',
    'customers_customers','customers_customer_services','customers_service_package_history','customers_service_status_history','customers_service_change_requests',
    'noc_network_resources','noc_customer_service_resources'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format('ALTER TABLE %I NO FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

ALTER TABLE noc_customer_service_resources DROP CONSTRAINT IF EXISTS fk_noc_assignment_tenant_resource;
ALTER TABLE noc_customer_service_resources DROP CONSTRAINT IF EXISTS fk_noc_assignment_tenant_customer_service;
ALTER TABLE noc_network_resources DROP CONSTRAINT IF EXISTS fk_noc_resource_tenant_parent;
ALTER TABLE noc_network_resources DROP CONSTRAINT IF EXISTS fk_noc_resource_tenant_branch;
ALTER TABLE customers_service_change_requests DROP CONSTRAINT IF EXISTS fk_change_request_tenant_customer_service;
ALTER TABLE customers_service_status_history DROP CONSTRAINT IF EXISTS fk_status_history_tenant_customer_service;
ALTER TABLE customers_service_package_history DROP CONSTRAINT IF EXISTS fk_package_history_tenant_new_package;
ALTER TABLE customers_service_package_history DROP CONSTRAINT IF EXISTS fk_package_history_tenant_old_package;
ALTER TABLE customers_service_package_history DROP CONSTRAINT IF EXISTS fk_package_history_tenant_customer_service;
ALTER TABLE customers_customer_services DROP CONSTRAINT IF EXISTS fk_customer_service_tenant_agency;
ALTER TABLE customers_customer_services DROP CONSTRAINT IF EXISTS fk_customer_service_tenant_branch;
ALTER TABLE customers_customer_services DROP CONSTRAINT IF EXISTS fk_customer_service_tenant_package_service;
ALTER TABLE customers_customer_services DROP CONSTRAINT IF EXISTS fk_customer_service_tenant_service;
ALTER TABLE customers_customer_services DROP CONSTRAINT IF EXISTS fk_customer_service_tenant_customer;
ALTER TABLE customers_customers DROP CONSTRAINT IF EXISTS fk_customer_tenant_agency;
ALTER TABLE customers_customers DROP CONSTRAINT IF EXISTS fk_customer_tenant_branch;
ALTER TABLE customers_customers DROP CONSTRAINT IF EXISTS fk_customer_tenant_company;
ALTER TABLE catalog_package_prices DROP CONSTRAINT IF EXISTS fk_package_price_tenant_package;
ALTER TABLE catalog_packages DROP CONSTRAINT IF EXISTS fk_package_tenant_service;
ALTER TABLE catalog_service_technical_fields DROP CONSTRAINT IF EXISTS fk_technical_field_tenant_service;
ALTER TABLE catalog_services DROP CONSTRAINT IF EXISTS fk_catalog_service_tenant_category;
"""


class Migration(migrations.Migration):
    dependencies = [
        ("tenancy", "0002_full01_tenant_integrity_rls"),
        ("catalog", "0001_initial"),
        ("customers", "0001_initial"),
        ("noc", "0001_initial"),
    ]

    operations = [migrations.RunSQL(FORWARD_SQL, REVERSE_SQL)]
