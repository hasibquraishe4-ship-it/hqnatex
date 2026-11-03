from django.db import migrations

LIFECYCLE_TABLES = [
    "customers_service_activations",
    "customers_installation_work_orders",
    "customers_provisioning_jobs",
    "customers_ip_assignments",
    "customers_radius_accounts",
    "customers_technical_test_results",
    "customers_activation_checklists",
    "customers_field_visits",
    "customers_service_suspensions",
    "customers_service_terminations",
    "customers_decommission_records",
    "customers_technical_change_history",
    "customers_technical_attachments",
    "customers_equipment_assignments",
    "customers_customer_tickets",
    "customers_service_agency_history",
]

def generate_forward_sql():
    sql = ["""
CREATE OR REPLACE FUNCTION hq_customer_service_scope_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    cs_tenant uuid;
    cs_company uuid;
BEGIN
    IF NEW.customer_service_id IS NOT NULL THEN
        SELECT tenant_id, company_id
          INTO cs_tenant, cs_company
          FROM customers_customer_services
         WHERE id = NEW.customer_service_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Customer service % not found', NEW.customer_service_id;
        END IF;

        IF NEW.tenant_id IS DISTINCT FROM cs_tenant THEN
            RAISE EXCEPTION 'Tenant mismatch with customer service: expected %, got %', cs_tenant, NEW.tenant_id;
        END IF;

        IF NEW.company_id IS DISTINCT FROM cs_company THEN
            RAISE EXCEPTION 'Company mismatch with customer service: expected %, got %', cs_company, NEW.company_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

ALTER FUNCTION hq_customer_service_scope_integrity() OWNER TO hqnatex_core;
"""]

    for table in LIFECYCLE_TABLES:
        sql.append(f"""
ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "{table}" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "{table}";
DROP POLICY IF EXISTS tenant_company_isolation ON "{table}";

CREATE POLICY tenant_company_isolation
ON "{table}"
FOR ALL TO PUBLIC
USING (
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    AND
    company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid
)
WITH CHECK (
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    AND
    company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid
);

DROP TRIGGER IF EXISTS trg_scope_integrity_{table} ON "{table}";

CREATE TRIGGER trg_scope_integrity_{table}
BEFORE INSERT OR UPDATE ON "{table}"
FOR EACH ROW EXECUTE FUNCTION hq_customer_service_scope_integrity();

ALTER TABLE "{table}" OWNER TO hqnatex_core;
""")

    return "\n".join(sql)


def generate_reverse_sql():
    sql = []
    for table in LIFECYCLE_TABLES:
        sql.append(f"""
DROP TRIGGER IF EXISTS trg_scope_integrity_{table} ON "{table}";
DROP POLICY IF EXISTS tenant_company_isolation ON "{table}";
ALTER TABLE "{table}" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "{table}" DISABLE ROW LEVEL SECURITY;
""")
    sql.append("DROP FUNCTION IF EXISTS hq_customer_service_scope_integrity();")
    return "\n".join(sql)


class Migration(migrations.Migration):

    dependencies = [
        ("customers", "0010_serviceactivation_provisioningjob_and_more"),
    ]

    operations = [
        migrations.RunSQL(
            generate_forward_sql(),
            reverse_sql=generate_reverse_sql(),
        ),
    ]
