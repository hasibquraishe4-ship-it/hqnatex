from django.db import migrations


FORWARD_SQL = r"""
ALTER TABLE sales_sales
  ADD CONSTRAINT fk_sale_tenant_company
  FOREIGN KEY (tenant_id, company_id)
  REFERENCES companies_companies (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE sales_sales
  ADD CONSTRAINT fk_sale_tenant_branch
  FOREIGN KEY (tenant_id, branch_id)
  REFERENCES branches_branches (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE sales_sales
  ADD CONSTRAINT fk_sale_tenant_agency
  FOREIGN KEY (tenant_id, agency_id)
  REFERENCES agencies_agencies (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE sales_sales
  ADD CONSTRAINT fk_sale_tenant_customer
  FOREIGN KEY (tenant_id, customer_id)
  REFERENCES customers_customers (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE sales_sales
  ADD CONSTRAINT fk_sale_tenant_customer_service
  FOREIGN KEY (tenant_id, customer_service_id)
  REFERENCES customers_customer_services (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE sales_sale_items
  ADD CONSTRAINT fk_sale_item_tenant_sale
  FOREIGN KEY (tenant_id, sale_id)
  REFERENCES sales_sales (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE sales_sale_items
  ADD CONSTRAINT fk_sale_item_tenant_service
  FOREIGN KEY (tenant_id, service_id)
  REFERENCES catalog_services (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE sales_sale_items
  ADD CONSTRAINT fk_sale_item_tenant_package
  FOREIGN KEY (tenant_id, package_id)
  REFERENCES catalog_packages (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE billing_invoices
  ADD CONSTRAINT fk_invoice_tenant_company
  FOREIGN KEY (tenant_id, company_id)
  REFERENCES companies_companies (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE billing_invoices
  ADD CONSTRAINT fk_invoice_tenant_branch
  FOREIGN KEY (tenant_id, branch_id)
  REFERENCES branches_branches (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE billing_invoices
  ADD CONSTRAINT fk_invoice_tenant_agency
  FOREIGN KEY (tenant_id, agency_id)
  REFERENCES agencies_agencies (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE billing_invoices
  ADD CONSTRAINT fk_invoice_tenant_customer
  FOREIGN KEY (tenant_id, customer_id)
  REFERENCES customers_customers (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE billing_invoices
  ADD CONSTRAINT fk_invoice_tenant_customer_service
  FOREIGN KEY (tenant_id, customer_service_id)
  REFERENCES customers_customer_services (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE billing_invoices
  ADD CONSTRAINT fk_invoice_tenant_sale
  FOREIGN KEY (tenant_id, sale_id)
  REFERENCES sales_sales (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE billing_invoice_items
  ADD CONSTRAINT fk_invoice_item_tenant_invoice
  FOREIGN KEY (tenant_id, invoice_id)
  REFERENCES billing_invoices (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE billing_invoice_items
  ADD CONSTRAINT fk_invoice_item_tenant_sale_item
  FOREIGN KEY (tenant_id, sale_item_id)
  REFERENCES sales_sale_items (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE billing_receivables
  ADD CONSTRAINT fk_receivable_tenant_invoice
  FOREIGN KEY (tenant_id, invoice_id)
  REFERENCES billing_invoices (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE billing_receivables
  ADD CONSTRAINT fk_receivable_tenant_customer
  FOREIGN KEY (tenant_id, customer_id)
  REFERENCES customers_customers (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE billing_payments
  ADD CONSTRAINT fk_payment_tenant_company
  FOREIGN KEY (tenant_id, company_id)
  REFERENCES companies_companies (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE billing_payments
  ADD CONSTRAINT fk_payment_tenant_branch
  FOREIGN KEY (tenant_id, branch_id)
  REFERENCES branches_branches (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE billing_payments
  ADD CONSTRAINT fk_payment_tenant_agency
  FOREIGN KEY (tenant_id, agency_id)
  REFERENCES agencies_agencies (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE billing_payments
  ADD CONSTRAINT fk_payment_tenant_customer
  FOREIGN KEY (tenant_id, customer_id)
  REFERENCES customers_customers (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE billing_payment_allocations
  ADD CONSTRAINT fk_payment_allocation_tenant_payment
  FOREIGN KEY (tenant_id, payment_id)
  REFERENCES billing_payments (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE billing_payment_allocations
  ADD CONSTRAINT fk_payment_allocation_tenant_receivable
  FOREIGN KEY (tenant_id, receivable_id)
  REFERENCES billing_receivables (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE billing_receipts
  ADD CONSTRAINT fk_receipt_tenant_payment
  FOREIGN KEY (tenant_id, payment_id)
  REFERENCES billing_payments (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE revenue_share_rules
  ADD CONSTRAINT fk_share_rule_tenant_company
  FOREIGN KEY (tenant_id, company_id)
  REFERENCES companies_companies (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE revenue_share_rules
  ADD CONSTRAINT fk_share_rule_tenant_agency
  FOREIGN KEY (tenant_id, agency_id)
  REFERENCES agencies_agencies (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE revenue_share_rules
  ADD CONSTRAINT fk_share_rule_tenant_service
  FOREIGN KEY (tenant_id, service_id)
  REFERENCES catalog_services (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE revenue_share_rules
  ADD CONSTRAINT ck_share_rule_split_100
  CHECK (
    partner_share_percent +
    company_base_share_percent +
    agency_gross_share_percent = 100.0000
  );

ALTER TABLE revenue_transactions
  ADD CONSTRAINT fk_revenue_tenant_company
  FOREIGN KEY (tenant_id, company_id)
  REFERENCES companies_companies (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE revenue_transactions
  ADD CONSTRAINT fk_revenue_tenant_branch
  FOREIGN KEY (tenant_id, branch_id)
  REFERENCES branches_branches (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE revenue_transactions
  ADD CONSTRAINT fk_revenue_tenant_agency
  FOREIGN KEY (tenant_id, agency_id)
  REFERENCES agencies_agencies (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE revenue_transactions
  ADD CONSTRAINT fk_revenue_tenant_sale
  FOREIGN KEY (tenant_id, sale_id)
  REFERENCES sales_sales (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE revenue_transactions
  ADD CONSTRAINT fk_revenue_tenant_sale_item
  FOREIGN KEY (tenant_id, sale_item_id)
  REFERENCES sales_sale_items (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE revenue_transactions
  ADD CONSTRAINT fk_revenue_tenant_customer
  FOREIGN KEY (tenant_id, customer_id)
  REFERENCES customers_customers (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE revenue_transactions
  ADD CONSTRAINT fk_revenue_tenant_customer_service
  FOREIGN KEY (tenant_id, customer_service_id)
  REFERENCES customers_customer_services (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE revenue_transactions
  ADD CONSTRAINT fk_revenue_tenant_service
  FOREIGN KEY (tenant_id, service_id)
  REFERENCES catalog_services (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE revenue_transactions
  ADD CONSTRAINT fk_revenue_tenant_share_rule
  FOREIGN KEY (tenant_id, share_rule_id)
  REFERENCES revenue_share_rules (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE revenue_allocations
  ADD CONSTRAINT fk_revenue_allocation_tenant_revenue
  FOREIGN KEY (tenant_id, revenue_transaction_id)
  REFERENCES revenue_transactions (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE revenue_allocations
  ADD CONSTRAINT fk_revenue_allocation_tenant_rule
  FOREIGN KEY (tenant_id, share_rule_id)
  REFERENCES revenue_share_rules (tenant_id, id)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE sales_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_sales FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON sales_sales;
CREATE POLICY tenant_isolation ON sales_sales
USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE sales_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_sale_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON sales_sale_items;
CREATE POLICY tenant_isolation ON sales_sale_items
USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON billing_invoices;
CREATE POLICY tenant_isolation ON billing_invoices
USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE billing_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoice_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON billing_invoice_items;
CREATE POLICY tenant_isolation ON billing_invoice_items
USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE billing_receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_receivables FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON billing_receivables;
CREATE POLICY tenant_isolation ON billing_receivables
USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE billing_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_payments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON billing_payments;
CREATE POLICY tenant_isolation ON billing_payments
USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE billing_payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_payment_allocations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON billing_payment_allocations;
CREATE POLICY tenant_isolation ON billing_payment_allocations
USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE billing_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_receipts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON billing_receipts;
CREATE POLICY tenant_isolation ON billing_receipts
USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE revenue_share_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_share_rules FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON revenue_share_rules;
CREATE POLICY tenant_isolation ON revenue_share_rules
USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE revenue_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_transactions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON revenue_transactions;
CREATE POLICY tenant_isolation ON revenue_transactions
USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE revenue_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_allocations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON revenue_allocations;
CREATE POLICY tenant_isolation ON revenue_allocations
USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
"""


REVERSE_SQL = r"""
DROP POLICY IF EXISTS tenant_isolation ON revenue_allocations;
DROP POLICY IF EXISTS tenant_isolation ON revenue_transactions;
DROP POLICY IF EXISTS tenant_isolation ON revenue_share_rules;
DROP POLICY IF EXISTS tenant_isolation ON billing_receipts;
DROP POLICY IF EXISTS tenant_isolation ON billing_payment_allocations;
DROP POLICY IF EXISTS tenant_isolation ON billing_payments;
DROP POLICY IF EXISTS tenant_isolation ON billing_receivables;
DROP POLICY IF EXISTS tenant_isolation ON billing_invoice_items;
DROP POLICY IF EXISTS tenant_isolation ON billing_invoices;
DROP POLICY IF EXISTS tenant_isolation ON sales_sale_items;
DROP POLICY IF EXISTS tenant_isolation ON sales_sales;

ALTER TABLE revenue_allocations NO FORCE ROW LEVEL SECURITY;
ALTER TABLE revenue_allocations DISABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_transactions NO FORCE ROW LEVEL SECURITY;
ALTER TABLE revenue_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_share_rules NO FORCE ROW LEVEL SECURITY;
ALTER TABLE revenue_share_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE billing_receipts NO FORCE ROW LEVEL SECURITY;
ALTER TABLE billing_receipts DISABLE ROW LEVEL SECURITY;
ALTER TABLE billing_payment_allocations NO FORCE ROW LEVEL SECURITY;
ALTER TABLE billing_payment_allocations DISABLE ROW LEVEL SECURITY;
ALTER TABLE billing_payments NO FORCE ROW LEVEL SECURITY;
ALTER TABLE billing_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE billing_receivables NO FORCE ROW LEVEL SECURITY;
ALTER TABLE billing_receivables DISABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoice_items NO FORCE ROW LEVEL SECURITY;
ALTER TABLE billing_invoice_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices NO FORCE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_sale_items NO FORCE ROW LEVEL SECURITY;
ALTER TABLE sales_sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_sales NO FORCE ROW LEVEL SECURITY;
ALTER TABLE sales_sales DISABLE ROW LEVEL SECURITY;

ALTER TABLE revenue_allocations DROP CONSTRAINT IF EXISTS fk_revenue_allocation_tenant_rule;
ALTER TABLE revenue_allocations DROP CONSTRAINT IF EXISTS fk_revenue_allocation_tenant_revenue;
ALTER TABLE revenue_transactions DROP CONSTRAINT IF EXISTS fk_revenue_tenant_share_rule;
ALTER TABLE revenue_transactions DROP CONSTRAINT IF EXISTS fk_revenue_tenant_service;
ALTER TABLE revenue_transactions DROP CONSTRAINT IF EXISTS fk_revenue_tenant_customer_service;
ALTER TABLE revenue_transactions DROP CONSTRAINT IF EXISTS fk_revenue_tenant_customer;
ALTER TABLE revenue_transactions DROP CONSTRAINT IF EXISTS fk_revenue_tenant_sale_item;
ALTER TABLE revenue_transactions DROP CONSTRAINT IF EXISTS fk_revenue_tenant_sale;
ALTER TABLE revenue_transactions DROP CONSTRAINT IF EXISTS fk_revenue_tenant_agency;
ALTER TABLE revenue_transactions DROP CONSTRAINT IF EXISTS fk_revenue_tenant_branch;
ALTER TABLE revenue_transactions DROP CONSTRAINT IF EXISTS fk_revenue_tenant_company;
ALTER TABLE revenue_share_rules DROP CONSTRAINT IF EXISTS ck_share_rule_split_100;
ALTER TABLE revenue_share_rules DROP CONSTRAINT IF EXISTS fk_share_rule_tenant_service;
ALTER TABLE revenue_share_rules DROP CONSTRAINT IF EXISTS fk_share_rule_tenant_agency;
ALTER TABLE revenue_share_rules DROP CONSTRAINT IF EXISTS fk_share_rule_tenant_company;
ALTER TABLE billing_receipts DROP CONSTRAINT IF EXISTS fk_receipt_tenant_payment;
ALTER TABLE billing_payment_allocations DROP CONSTRAINT IF EXISTS fk_payment_allocation_tenant_receivable;
ALTER TABLE billing_payment_allocations DROP CONSTRAINT IF EXISTS fk_payment_allocation_tenant_payment;
ALTER TABLE billing_payments DROP CONSTRAINT IF EXISTS fk_payment_tenant_customer;
ALTER TABLE billing_payments DROP CONSTRAINT IF EXISTS fk_payment_tenant_agency;
ALTER TABLE billing_payments DROP CONSTRAINT IF EXISTS fk_payment_tenant_branch;
ALTER TABLE billing_payments DROP CONSTRAINT IF EXISTS fk_payment_tenant_company;
ALTER TABLE billing_receivables DROP CONSTRAINT IF EXISTS fk_receivable_tenant_customer;
ALTER TABLE billing_receivables DROP CONSTRAINT IF EXISTS fk_receivable_tenant_invoice;
ALTER TABLE billing_invoice_items DROP CONSTRAINT IF EXISTS fk_invoice_item_tenant_sale_item;
ALTER TABLE billing_invoice_items DROP CONSTRAINT IF EXISTS fk_invoice_item_tenant_invoice;
ALTER TABLE billing_invoices DROP CONSTRAINT IF EXISTS fk_invoice_tenant_sale;
ALTER TABLE billing_invoices DROP CONSTRAINT IF EXISTS fk_invoice_tenant_customer_service;
ALTER TABLE billing_invoices DROP CONSTRAINT IF EXISTS fk_invoice_tenant_customer;
ALTER TABLE billing_invoices DROP CONSTRAINT IF EXISTS fk_invoice_tenant_agency;
ALTER TABLE billing_invoices DROP CONSTRAINT IF EXISTS fk_invoice_tenant_branch;
ALTER TABLE billing_invoices DROP CONSTRAINT IF EXISTS fk_invoice_tenant_company;
ALTER TABLE sales_sale_items DROP CONSTRAINT IF EXISTS fk_sale_item_tenant_package;
ALTER TABLE sales_sale_items DROP CONSTRAINT IF EXISTS fk_sale_item_tenant_service;
ALTER TABLE sales_sale_items DROP CONSTRAINT IF EXISTS fk_sale_item_tenant_sale;
ALTER TABLE sales_sales DROP CONSTRAINT IF EXISTS fk_sale_tenant_customer_service;
ALTER TABLE sales_sales DROP CONSTRAINT IF EXISTS fk_sale_tenant_customer;
ALTER TABLE sales_sales DROP CONSTRAINT IF EXISTS fk_sale_tenant_agency;
ALTER TABLE sales_sales DROP CONSTRAINT IF EXISTS fk_sale_tenant_branch;
ALTER TABLE sales_sales DROP CONSTRAINT IF EXISTS fk_sale_tenant_company;
"""


class Migration(migrations.Migration):
    dependencies = [
        ("noc", "0002_full02_tenant_integrity_rls"),
        ("sales", "0001_initial"),
        ("billing", "0002_initial"),
        ("revenue", "0002_initial"),
    ]

    operations = [
        migrations.RunSQL(FORWARD_SQL, REVERSE_SQL),
    ]
