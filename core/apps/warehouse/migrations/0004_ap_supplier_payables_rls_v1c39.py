from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("warehouse", "0003_ap_supplier_payables_v1c38"),
    ]

    operations = [
        migrations.RunSQL(
            sql='ALTER TABLE "warehouse_supplierinvoice" ENABLE ROW LEVEL SECURITY;\nALTER TABLE "warehouse_supplierinvoice" FORCE ROW LEVEL SECURITY;\nCREATE POLICY "tenant_company_isolation" ON "warehouse_supplierinvoice" FOR ALL\nTO PUBLIC USING (tenant_id = NULLIF(\n        current_setting(\'app.current_tenant_id\', true),\n        \'\'\n    )::uuid\n    AND\n    company_id = NULLIF(\n        current_setting(\'app.current_company_id\', true),\n        \'\'\n    )::uuid) WITH CHECK (tenant_id = NULLIF(\n        current_setting(\'app.current_tenant_id\', true),\n        \'\'\n    )::uuid\n    AND\n    company_id = NULLIF(\n        current_setting(\'app.current_company_id\', true),\n        \'\'\n    )::uuid);',
            reverse_sql='DROP POLICY IF EXISTS "tenant_company_isolation" ON "warehouse_supplierinvoice";\nALTER TABLE "warehouse_supplierinvoice" NO FORCE ROW LEVEL SECURITY;\nALTER TABLE "warehouse_supplierinvoice" DISABLE ROW LEVEL SECURITY;',
        ),
        migrations.RunSQL(
            sql='ALTER TABLE "warehouse_supplierpaymentallocation" ENABLE ROW LEVEL SECURITY;\nALTER TABLE "warehouse_supplierpaymentallocation" FORCE ROW LEVEL SECURITY;\nCREATE POLICY "tenant_company_isolation" ON "warehouse_supplierpaymentallocation" FOR ALL\nTO PUBLIC USING (tenant_id = NULLIF(\n        current_setting(\'app.current_tenant_id\', true),\n        \'\'\n    )::uuid\n    AND\n    company_id = NULLIF(\n        current_setting(\'app.current_company_id\', true),\n        \'\'\n    )::uuid) WITH CHECK (tenant_id = NULLIF(\n        current_setting(\'app.current_tenant_id\', true),\n        \'\'\n    )::uuid\n    AND\n    company_id = NULLIF(\n        current_setting(\'app.current_company_id\', true),\n        \'\'\n    )::uuid);',
            reverse_sql='DROP POLICY IF EXISTS "tenant_company_isolation" ON "warehouse_supplierpaymentallocation";\nALTER TABLE "warehouse_supplierpaymentallocation" NO FORCE ROW LEVEL SECURITY;\nALTER TABLE "warehouse_supplierpaymentallocation" DISABLE ROW LEVEL SECURITY;',
        ),
    ]
