from django.db import migrations


POLICY_NAME = "tenant_company_isolation"

TABLES = (
    "warehouse_goodsreceipt",
    "warehouse_goodsreceiptline",
    "warehouse_inventoryitem",
    "warehouse_inventoryserial",
    "warehouse_purchaseorder",
    "warehouse_purchaseorderline",
    "warehouse_purchaserequest",
    "warehouse_purchaserequestline",
    "warehouse_stockmovement",
    "warehouse_supplier",
    "warehouse_warehouse",
    "warehouse_warehousestock",
)


def _forward_sql():
    statements = []

    for table in TABLES:
        statements.append(
            f"""
ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "{table}" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS {POLICY_NAME} ON "{table}";

CREATE POLICY {POLICY_NAME}
ON "{table}"
FOR ALL
TO PUBLIC
USING (
    tenant_id = NULLIF(
        current_setting('app.current_tenant_id', true),
        ''
    )::uuid
    AND
    company_id = NULLIF(
        current_setting('app.current_company_id', true),
        ''
    )::uuid
)
WITH CHECK (
    tenant_id = NULLIF(
        current_setting('app.current_tenant_id', true),
        ''
    )::uuid
    AND
    company_id = NULLIF(
        current_setting('app.current_company_id', true),
        ''
    )::uuid
);
"""
        )

    return "\n".join(statements)


def _reverse_sql():
    statements = []

    for table in reversed(TABLES):
        statements.append(
            f"""
DROP POLICY IF EXISTS {POLICY_NAME} ON "{table}";
ALTER TABLE "{table}" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "{table}" DISABLE ROW LEVEL SECURITY;
"""
        )

    return "\n".join(statements)


FORWARD_SQL = _forward_sql()
REVERSE_SQL = _reverse_sql()


class Migration(migrations.Migration):

    dependencies = [
        ("warehouse", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(
            sql=FORWARD_SQL,
            reverse_sql=REVERSE_SQL,
        ),
    ]
