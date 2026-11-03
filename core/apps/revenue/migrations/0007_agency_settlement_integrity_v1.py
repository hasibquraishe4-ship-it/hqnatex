from django.db import migrations


FORWARD_SQL = r"""
CREATE UNIQUE INDEX IF NOT EXISTS uq_ag_ref_tenant_comp_id
ON agencies_agencies (
    tenant_id,
    company_id,
    id
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_rev_ref_tenant_comp_id
ON revenue_transactions (
    tenant_id,
    company_id,
    id
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_rule_ref_tenant_comp_id
ON revenue_share_rules (
    tenant_id,
    company_id,
    id
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_set_ref_tenant_comp_id
ON revenue_agency_settlements (
    tenant_id,
    company_id,
    id
);


ALTER TABLE revenue_agency_settlements
DROP CONSTRAINT IF EXISTS fk_agset_tenant_company;

ALTER TABLE revenue_agency_settlements
ADD CONSTRAINT fk_agset_tenant_company
FOREIGN KEY (
    tenant_id,
    company_id
)
REFERENCES companies_companies (
    tenant_id,
    id
)
DEFERRABLE INITIALLY DEFERRED;


ALTER TABLE revenue_agency_settlements
DROP CONSTRAINT IF EXISTS fk_agset_tenant_comp_agency;

ALTER TABLE revenue_agency_settlements
ADD CONSTRAINT fk_agset_tenant_comp_agency
FOREIGN KEY (
    tenant_id,
    company_id,
    agency_id
)
REFERENCES agencies_agencies (
    tenant_id,
    company_id,
    id
)
DEFERRABLE INITIALLY DEFERRED;


ALTER TABLE revenue_agency_settlement_lines
DROP CONSTRAINT IF EXISTS fk_agline_tenant_company;

ALTER TABLE revenue_agency_settlement_lines
ADD CONSTRAINT fk_agline_tenant_company
FOREIGN KEY (
    tenant_id,
    company_id
)
REFERENCES companies_companies (
    tenant_id,
    id
)
DEFERRABLE INITIALLY DEFERRED;


ALTER TABLE revenue_agency_settlement_lines
DROP CONSTRAINT IF EXISTS fk_agline_tenant_comp_settle;

ALTER TABLE revenue_agency_settlement_lines
ADD CONSTRAINT fk_agline_tenant_comp_settle
FOREIGN KEY (
    tenant_id,
    company_id,
    settlement_id
)
REFERENCES revenue_agency_settlements (
    tenant_id,
    company_id,
    id
)
DEFERRABLE INITIALLY DEFERRED;


ALTER TABLE revenue_agency_settlement_lines
DROP CONSTRAINT IF EXISTS fk_agline_tenant_comp_rev;

ALTER TABLE revenue_agency_settlement_lines
ADD CONSTRAINT fk_agline_tenant_comp_rev
FOREIGN KEY (
    tenant_id,
    company_id,
    revenue_transaction_id
)
REFERENCES revenue_transactions (
    tenant_id,
    company_id,
    id
)
DEFERRABLE INITIALLY DEFERRED;


ALTER TABLE revenue_agency_settlement_lines
DROP CONSTRAINT IF EXISTS fk_agline_tenant_comp_rule;

ALTER TABLE revenue_agency_settlement_lines
ADD CONSTRAINT fk_agline_tenant_comp_rule
FOREIGN KEY (
    tenant_id,
    company_id,
    share_rule_id
)
REFERENCES revenue_share_rules (
    tenant_id,
    company_id,
    id
)
DEFERRABLE INITIALLY DEFERRED;


ALTER TABLE revenue_agency_settlements
ENABLE ROW LEVEL SECURITY;

ALTER TABLE revenue_agency_settlements
FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation
ON revenue_agency_settlements;

CREATE POLICY tenant_isolation
ON revenue_agency_settlements
USING (
    tenant_id =
    NULLIF(
        current_setting(
            'app.current_tenant_id',
            true
        ),
        ''
    )::uuid
)
WITH CHECK (
    tenant_id =
    NULLIF(
        current_setting(
            'app.current_tenant_id',
            true
        ),
        ''
    )::uuid
);


ALTER TABLE revenue_agency_settlement_lines
ENABLE ROW LEVEL SECURITY;

ALTER TABLE revenue_agency_settlement_lines
FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation
ON revenue_agency_settlement_lines;

CREATE POLICY tenant_isolation
ON revenue_agency_settlement_lines
USING (
    tenant_id =
    NULLIF(
        current_setting(
            'app.current_tenant_id',
            true
        ),
        ''
    )::uuid
)
WITH CHECK (
    tenant_id =
    NULLIF(
        current_setting(
            'app.current_tenant_id',
            true
        ),
        ''
    )::uuid
);
"""


REVERSE_SQL = r"""
DROP POLICY IF EXISTS tenant_isolation
ON revenue_agency_settlement_lines;

ALTER TABLE revenue_agency_settlement_lines
NO FORCE ROW LEVEL SECURITY;

ALTER TABLE revenue_agency_settlement_lines
DISABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS tenant_isolation
ON revenue_agency_settlements;

ALTER TABLE revenue_agency_settlements
NO FORCE ROW LEVEL SECURITY;

ALTER TABLE revenue_agency_settlements
DISABLE ROW LEVEL SECURITY;


ALTER TABLE revenue_agency_settlement_lines
DROP CONSTRAINT IF EXISTS fk_agline_tenant_comp_rule;

ALTER TABLE revenue_agency_settlement_lines
DROP CONSTRAINT IF EXISTS fk_agline_tenant_comp_rev;

ALTER TABLE revenue_agency_settlement_lines
DROP CONSTRAINT IF EXISTS fk_agline_tenant_comp_settle;

ALTER TABLE revenue_agency_settlement_lines
DROP CONSTRAINT IF EXISTS fk_agline_tenant_company;


ALTER TABLE revenue_agency_settlements
DROP CONSTRAINT IF EXISTS fk_agset_tenant_comp_agency;

ALTER TABLE revenue_agency_settlements
DROP CONSTRAINT IF EXISTS fk_agset_tenant_company;


DROP INDEX IF EXISTS uq_set_ref_tenant_comp_id;
DROP INDEX IF EXISTS uq_rule_ref_tenant_comp_id;
DROP INDEX IF EXISTS uq_rev_ref_tenant_comp_id;
DROP INDEX IF EXISTS uq_ag_ref_tenant_comp_id;
"""


class Migration(migrations.Migration):
    dependencies = [
        (
            "revenue",
            "0006_agency_settlement_v1",
        ),
    ]

    operations = [
        migrations.RunSQL(
            FORWARD_SQL,
            REVERSE_SQL,
        ),
    ]
