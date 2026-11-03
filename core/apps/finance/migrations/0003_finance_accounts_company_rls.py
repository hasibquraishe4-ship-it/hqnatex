from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0002_tenant_integrity_rls'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE finance_accounts
                    ENABLE ROW LEVEL SECURITY;

                ALTER TABLE finance_accounts
                    FORCE ROW LEVEL SECURITY;

                DROP POLICY IF EXISTS tenant_isolation
                    ON finance_accounts;

                DROP POLICY IF EXISTS tenant_company_isolation
                    ON finance_accounts;

                CREATE POLICY tenant_company_isolation
                    ON finance_accounts
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
            """,
            reverse_sql="""
                DROP POLICY IF EXISTS tenant_company_isolation
                    ON finance_accounts;

                DROP POLICY IF EXISTS tenant_isolation
                    ON finance_accounts;

                CREATE POLICY tenant_isolation
                    ON finance_accounts
                    USING (
                        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                    )
                    WITH CHECK (
                        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                    );
            """,
        ),
    ]
