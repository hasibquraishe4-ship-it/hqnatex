import uuid

import django.db.models.deletion
from django.db import migrations, models



SCOPE_INTEGRITY_FORWARD = r"""
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_cmpmem_tenant_membership'
          AND conrelid = 'iam_company_memberships'::regclass
    ) THEN
        ALTER TABLE iam_company_memberships
        ADD CONSTRAINT fk_cmpmem_tenant_membership
        FOREIGN KEY (tenant_id, membership_id)
        REFERENCES iam_tenant_memberships(tenant_id, id)
        DEFERRABLE INITIALLY DEFERRED;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_cmpmem_tenant_company'
          AND conrelid = 'iam_company_memberships'::regclass
    ) THEN
        ALTER TABLE iam_company_memberships
        ADD CONSTRAINT fk_cmpmem_tenant_company
        FOREIGN KEY (tenant_id, company_id)
        REFERENCES companies_companies(tenant_id, id)
        DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
"""

SCOPE_INTEGRITY_REVERSE = r"""
ALTER TABLE iam_company_memberships
DROP CONSTRAINT IF EXISTS fk_cmpmem_tenant_membership;

ALTER TABLE iam_company_memberships
DROP CONSTRAINT IF EXISTS fk_cmpmem_tenant_company;
"""


RLS_FORWARD = r"""
ALTER TABLE iam_company_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam_company_memberships FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_membership_tenant_isolation
ON iam_company_memberships;

CREATE POLICY company_membership_tenant_isolation
ON iam_company_memberships
USING (
    tenant_id::text =
    current_setting('app.current_tenant_id', true)
)
WITH CHECK (
    tenant_id::text =
    current_setting('app.current_tenant_id', true)
);
"""

RLS_REVERSE = r"""
DROP POLICY IF EXISTS company_membership_tenant_isolation
ON iam_company_memberships;

ALTER TABLE iam_company_memberships NO FORCE ROW LEVEL SECURITY;
ALTER TABLE iam_company_memberships DISABLE ROW LEVEL SECURITY;
"""


class Migration(migrations.Migration):

    dependencies = [
        ("iam", "0001_initial"),
        ("companies", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="CompanyMembership",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("active", "Active"),
                            ("inactive", "Inactive"),
                            ("suspended", "Suspended"),
                        ],
                        default="active",
                        max_length=16,
                    ),
                ),
                ("is_default", models.BooleanField(default=False)),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="user_memberships",
                        to="companies.company",
                    ),
                ),
                (
                    "membership",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="company_memberships",
                        to="iam.tenantmembership",
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="company_memberships",
                        to="tenancy.tenant",
                    ),
                ),
            ],
            options={
                "db_table": "iam_company_memberships",
            },
        ),

        migrations.AddConstraint(
            model_name="companymembership",
            constraint=models.UniqueConstraint(
                fields=("membership", "company"),
                name="uq_company_membership_grant",
            ),
        ),

        migrations.AddConstraint(
            model_name="companymembership",
            constraint=models.UniqueConstraint(
                fields=("membership",),
                condition=models.Q(
                    ("is_default", True),
                    ("status", "active"),
                ),
                name="uq_company_membership_default",
            ),
        ),

        migrations.AddConstraint(
            model_name="companymembership",
            constraint=models.CheckConstraint(
                condition=models.Q(is_default=False) | models.Q(status="active"),
                name="ck_cmpmem_default_active",
            ),
        ),

        migrations.AddIndex(
            model_name="companymembership",
            index=models.Index(
                fields=["tenant", "status"],
                name="ix_cmpmem_tenant_status",
            ),
        ),

        migrations.AddIndex(
            model_name="companymembership",
            index=models.Index(
                fields=["membership", "status"],
                name="ix_cmpmem_member_status",
            ),
        ),

        migrations.AddIndex(
            model_name="companymembership",
            index=models.Index(
                fields=["company", "status"],
                name="ix_cmpmem_company_status",
            ),
        ),

        migrations.RunSQL(
            SCOPE_INTEGRITY_FORWARD,
            SCOPE_INTEGRITY_REVERSE,
        ),

        migrations.RunSQL(
            RLS_FORWARD,
            RLS_REVERSE,
        ),
    ]
