"""create core tenant iam audit tables

Revision ID: 0001_core_tenant_iam_audit
Revises:
Create Date: 2026-09-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_core_tenant_iam_audit"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def uuid_pk() -> sa.Column:
    return sa.Column(
        "id",
        postgresql.UUID(as_uuid=True),
        primary_key=True,
        nullable=False,
        server_default=sa.text("gen_random_uuid()"),
    )


def audit_columns() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
    ]


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.execute("CREATE SCHEMA IF NOT EXISTS platform")
    op.execute("CREATE SCHEMA IF NOT EXISTS tenant")
    op.execute("CREATE SCHEMA IF NOT EXISTS iam")
    op.execute("CREATE SCHEMA IF NOT EXISTS audit")

    op.create_table(
        "tenants",
        uuid_pk(),
        sa.Column("code", sa.String(64), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="draft"),
        sa.CheckConstraint("status in ('draft','active','suspended','closed')", "ck_tenants_status"),
        sa.UniqueConstraint("code", name="uq_tenants_code"),
        *audit_columns(),
        schema="platform",
    )

    op.create_table(
        "companies",
        uuid_pk(),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("legal_name", sa.String(255), nullable=False),
        sa.Column("display_name", sa.String(255), nullable=False),
        sa.Column("tin", sa.String(64), nullable=True),
        sa.Column("license_no", sa.String(128), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="active"),
        sa.ForeignKeyConstraint(["tenant_id"], ["platform.tenants.id"], ondelete="RESTRICT"),
        sa.UniqueConstraint("tenant_id", "legal_name", name="uq_companies_tenant_legal_name"),
        sa.CheckConstraint("status in ('active','inactive')", "ck_companies_status"),
        *audit_columns(),
        schema="tenant",
    )

    op.create_table(
        "users",
        uuid_pk(),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="active"),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.CheckConstraint("status in ('active','disabled','locked')", "ck_users_status"),
        *audit_columns(),
        schema="iam",
    )

    op.create_table(
        "tenant_memberships",
        uuid_pk(),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="active"),
        sa.ForeignKeyConstraint(["tenant_id"], ["platform.tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["iam.users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("tenant_id", "user_id", name="uq_memberships_tenant_user"),
        sa.CheckConstraint("status in ('active','disabled')", "ck_memberships_status"),
        *audit_columns(),
        schema="iam",
    )

    op.create_table(
        "roles",
        uuid_pk(),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("key", sa.String(128), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.ForeignKeyConstraint(["tenant_id"], ["platform.tenants.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("tenant_id", "key", name="uq_roles_tenant_key"),
        *audit_columns(),
        schema="iam",
    )

    op.create_table(
        "permissions",
        uuid_pk(),
        sa.Column("key", sa.String(160), nullable=False),
        sa.Column("module", sa.String(80), nullable=False),
        sa.Column("action", sa.String(80), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.UniqueConstraint("key", name="uq_permissions_key"),
        *audit_columns(),
        schema="iam",
    )

    op.create_table(
        "role_permissions",
        sa.Column("role_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("permission_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["role_id"], ["iam.roles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["permission_id"], ["iam.permissions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("role_id", "permission_id", name="pk_role_permissions"),
        schema="iam",
    )

    op.create_table(
        "membership_roles",
        sa.Column("membership_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["membership_id"], ["iam.tenant_memberships.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["role_id"], ["iam.roles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("membership_id", "role_id", name="pk_membership_roles"),
        schema="iam",
    )

    op.create_table(
        "audit_logs",
        uuid_pk(),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(160), nullable=False),
        sa.Column("object_type", sa.String(160), nullable=False),
        sa.Column("object_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("request_id", sa.String(80), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
        sa.ForeignKeyConstraint(["tenant_id"], ["platform.tenants.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["actor_user_id"], ["iam.users.id"], ondelete="SET NULL"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        schema="audit",
    )

    op.create_index("ix_companies_tenant_status", "companies", ["tenant_id", "status"], schema="tenant")
    op.create_index("ix_memberships_tenant_status", "tenant_memberships", ["tenant_id", "status"], schema="iam")
    op.create_index("ix_audit_logs_tenant_created", "audit_logs", ["tenant_id", "created_at"], schema="audit")


def downgrade() -> None:
    op.drop_index("ix_audit_logs_tenant_created", table_name="audit_logs", schema="audit")
    op.drop_index("ix_memberships_tenant_status", table_name="tenant_memberships", schema="iam")
    op.drop_index("ix_companies_tenant_status", table_name="companies", schema="tenant")
    op.drop_table("audit_logs", schema="audit")
    op.drop_table("membership_roles", schema="iam")
    op.drop_table("role_permissions", schema="iam")
    op.drop_table("permissions", schema="iam")
    op.drop_table("roles", schema="iam")
    op.drop_table("tenant_memberships", schema="iam")
    op.drop_table("users", schema="iam")
    op.drop_table("companies", schema="tenant")
    op.drop_table("tenants", schema="platform")

