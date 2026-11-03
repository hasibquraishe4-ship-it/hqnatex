from django.db import migrations


TABLES = ['hr_employees', 'hr_employment_contracts', 'hr_work_shifts', 'hr_employee_shifts', 'hr_attendance', 'hr_leave_types', 'hr_leave_balances', 'hr_leave_requests', 'hr_public_holidays', 'hr_overtime', 'hr_salary_profiles', 'hr_payroll_tax_brackets', 'hr_allowances', 'hr_deductions', 'hr_payroll_periods', 'hr_payroll_runs', 'hr_payroll_entries', 'hr_payroll_payments', 'hr_payslips', 'hr_employee_loans', 'hr_salary_advances', 'hr_vacancies', 'hr_candidates', 'hr_interviews', 'hr_onboarding_tasks', 'hr_performance_reviews', 'hr_trainings', 'hr_training_participants', 'hr_disciplinary_actions', 'hr_promotion_transfers', 'hr_employee_assets', 'hr_emergency_contacts', 'hr_bank_accounts', 'hr_employee_documents', 'hr_terminations', 'hr_clearances', 'hr_approval_requests', 'hr_audit_events']


def enable_rls(
    apps,
    schema_editor,
):

    cursor = (
        schema_editor
        .connection
        .cursor()
    )

    for table in TABLES:

        cursor.execute(
            f'DROP POLICY IF EXISTS '
            f'"tenant_company_isolation" '
            f'ON "{table}"'
        )

        cursor.execute(
            f'ALTER TABLE "{table}" '
            f'ENABLE ROW LEVEL SECURITY'
        )

        cursor.execute(
            f'ALTER TABLE "{table}" '
            f'FORCE ROW LEVEL SECURITY'
        )

        cursor.execute(
            f"""
            CREATE POLICY
                "tenant_company_isolation"
            ON "{table}"
            FOR ALL
            TO PUBLIC
            USING (
                tenant_id =
                NULLIF(
                    current_setting(
                        'app.current_tenant_id',
                        true
                    ),
                    ''
                )::uuid
                AND
                company_id =
                NULLIF(
                    current_setting(
                        'app.current_company_id',
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
                AND
                company_id =
                NULLIF(
                    current_setting(
                        'app.current_company_id',
                        true
                    ),
                    ''
                )::uuid
            )
            """
        )


def disable_rls(
    apps,
    schema_editor,
):

    cursor = (
        schema_editor
        .connection
        .cursor()
    )

    for table in TABLES:

        cursor.execute(
            f'DROP POLICY IF EXISTS '
            f'"tenant_company_isolation" '
            f'ON "{table}"'
        )

        cursor.execute(
            f'ALTER TABLE "{table}" '
            f'NO FORCE ROW LEVEL SECURITY'
        )

        cursor.execute(
            f'ALTER TABLE "{table}" '
            f'DISABLE ROW LEVEL SECURITY'
        )


class Migration(
    migrations.Migration
):

    dependencies = [
        (
            "hr",
            "0003_full_hr_payroll_v1",
        ),
    ]

    operations = [
        migrations.RunPython(
            enable_rls,
            disable_rls,
        ),
    ]
