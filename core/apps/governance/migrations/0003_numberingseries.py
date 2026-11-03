import django.db.models.deletion
import django.utils.timezone
import uuid

from django.db import migrations, models


FORWARD_SQL = r"""
ALTER TABLE "numbering_series" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "numbering_series" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_company_isolation ON "numbering_series";

CREATE POLICY tenant_company_isolation
ON "numbering_series"
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


REVERSE_SQL = r"""
DROP POLICY IF EXISTS tenant_company_isolation ON "numbering_series";
ALTER TABLE "numbering_series" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "numbering_series" DISABLE ROW LEVEL SECURITY;
"""


class Migration(migrations.Migration):

    dependencies = [
        ("companies", "0001_initial"),
        ("governance", "0002_scope_rls"),
        ("tenancy", "0002_full01_tenant_integrity_rls"),
    ]

    operations = [
        migrations.CreateModel(
            name="NumberingSeries",
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
                ("series_key", models.CharField(max_length=120)),
                (
                    "prefix",
                    models.CharField(
                        blank=True,
                        max_length=40,
                        null=True,
                    ),
                ),
                ("next_number", models.BigIntegerField(default=1)),
                ("padding", models.SmallIntegerField(default=6)),
                (
                    "reset_policy",
                    models.CharField(
                        default="none",
                        max_length=20,
                    ),
                ),
                (
                    "last_reset_at",
                    models.DateTimeField(
                        blank=True,
                        null=True,
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                (
                    "created_at",
                    models.DateTimeField(
                        default=django.utils.timezone.now,
                    ),
                ),
                (
                    "updated_at",
                    models.DateTimeField(
                        default=django.utils.timezone.now,
                    ),
                ),
                (
                    "company",
                    models.ForeignKey(
                        db_column="company_id",
                        on_delete=django.db.models.deletion.PROTECT,
                        to="companies.company",
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        db_column="tenant_id",
                        on_delete=django.db.models.deletion.PROTECT,
                        to="tenancy.tenant",
                    ),
                ),
            ],
            options={
                "db_table": "numbering_series",
                "constraints": [
                    models.UniqueConstraint(
                        fields=("tenant", "company", "series_key"),
                        name="uq_numbering_series_0",
                    ),
                    models.CheckConstraint(
                        condition=models.Q(
                            ("next_number__gte", 1)
                        ),
                        name="ck_numbering_series_next_number_gte_1",
                    ),
                    models.CheckConstraint(
                        condition=models.Q(
                            ("padding__gte", 1),
                            ("padding__lte", 20),
                        ),
                        name="ck_numbering_series_padding_1_20",
                    ),
                ],
                "indexes": [
                    models.Index(
                        fields=[
                            "tenant",
                            "company",
                            "series_key",
                        ],
                        name="ix_numseries_scope_key",
                    ),
                ],
            },
        ),

        migrations.RunSQL(
            FORWARD_SQL,
            reverse_sql=REVERSE_SQL,
        ),
    ]
