"""enforce tenant role integrity

Revision ID: 9749481c08e8
Revises: 0001_core_tenant_iam_audit
Create Date: 2026-09-13
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "9749481c08e8"
down_revision: str | None = "0001_core_tenant_iam_audit"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Composite parent keys are required so PostgreSQL can enforce that
    # a membership and assigned role belong to the same tenant.
    op.create_unique_constraint(
        "uq_memberships_tenant_id_id",
        "tenant_memberships",
        ["tenant_id", "id"],
        schema="iam",
    )

    op.create_unique_constraint(
        "uq_roles_tenant_id_id",
        "roles",
        ["tenant_id", "id"],
        schema="iam",
    )

    # Add tenant ownership directly to the association table.
    op.add_column(
        "membership_roles",
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        schema="iam",
    )

    # Safe backfill for any pre-existing rows.
    op.execute(
        """
        UPDATE iam.membership_roles AS mr
        SET tenant_id = tm.tenant_id
        FROM iam.tenant_memberships AS tm
        WHERE tm.id = mr.membership_id
        """
    )

    # Abort migration if legacy data contains a cross-tenant assignment.
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM iam.membership_roles AS mr
                JOIN iam.tenant_memberships AS tm
                  ON tm.id = mr.membership_id
                JOIN iam.roles AS r
                  ON r.id = mr.role_id
                WHERE tm.tenant_id <> r.tenant_id
            ) THEN
                RAISE EXCEPTION
                    'Cross-tenant membership-role assignments exist';
            END IF;
        END
        $$;
        """
    )

    op.alter_column(
        "membership_roles",
        "tenant_id",
        nullable=False,
        schema="iam",
    )

    # Replace the two independent foreign keys with tenant-aware
    # composite foreign keys.
    op.drop_constraint(
        "membership_roles_membership_id_fkey",
        "membership_roles",
        schema="iam",
        type_="foreignkey",
    )

    op.drop_constraint(
        "membership_roles_role_id_fkey",
        "membership_roles",
        schema="iam",
        type_="foreignkey",
    )

    op.create_foreign_key(
        "fk_membership_roles_tenant_membership",
        "membership_roles",
        "tenant_memberships",
        ["tenant_id", "membership_id"],
        ["tenant_id", "id"],
        source_schema="iam",
        referent_schema="iam",
        ondelete="CASCADE",
    )

    op.create_foreign_key(
        "fk_membership_roles_tenant_role",
        "membership_roles",
        "roles",
        ["tenant_id", "role_id"],
        ["tenant_id", "id"],
        source_schema="iam",
        referent_schema="iam",
        ondelete="CASCADE",
    )

    # Supporting indexes for FK operations and common lookups.
    op.create_index(
        "ix_memberships_user_id",
        "tenant_memberships",
        ["user_id"],
        schema="iam",
    )

    op.create_index(
        "ix_role_permissions_permission_id",
        "role_permissions",
        ["permission_id"],
        schema="iam",
    )

    op.create_index(
        "ix_membership_roles_tenant_role",
        "membership_roles",
        ["tenant_id", "role_id"],
        schema="iam",
    )

    op.create_index(
        "ix_audit_logs_actor_user_id",
        "audit_logs",
        ["actor_user_id"],
        schema="audit",
    )


def downgrade() -> None:
    op.drop_index(
        "ix_audit_logs_actor_user_id",
        table_name="audit_logs",
        schema="audit",
    )

    op.drop_index(
        "ix_membership_roles_tenant_role",
        table_name="membership_roles",
        schema="iam",
    )

    op.drop_index(
        "ix_role_permissions_permission_id",
        table_name="role_permissions",
        schema="iam",
    )

    op.drop_index(
        "ix_memberships_user_id",
        table_name="tenant_memberships",
        schema="iam",
    )

    op.drop_constraint(
        "fk_membership_roles_tenant_role",
        "membership_roles",
        schema="iam",
        type_="foreignkey",
    )

    op.drop_constraint(
        "fk_membership_roles_tenant_membership",
        "membership_roles",
        schema="iam",
        type_="foreignkey",
    )

    # Restore original independent foreign keys.
    op.create_foreign_key(
        "membership_roles_membership_id_fkey",
        "membership_roles",
        "tenant_memberships",
        ["membership_id"],
        ["id"],
        source_schema="iam",
        referent_schema="iam",
        ondelete="CASCADE",
    )

    op.create_foreign_key(
        "membership_roles_role_id_fkey",
        "membership_roles",
        "roles",
        ["role_id"],
        ["id"],
        source_schema="iam",
        referent_schema="iam",
        ondelete="CASCADE",
    )

    op.drop_column(
        "membership_roles",
        "tenant_id",
        schema="iam",
    )

    op.drop_constraint(
        "uq_roles_tenant_id_id",
        "roles",
        schema="iam",
        type_="unique",
    )

    op.drop_constraint(
        "uq_memberships_tenant_id_id",
        "tenant_memberships",
        schema="iam",
        type_="unique",
    )
