from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    String,
    Table,
    Text,
    UniqueConstraint,
    and_,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column(
        "role_id",
        PG_UUID(as_uuid=True),
        ForeignKey("iam.roles.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "permission_id",
        PG_UUID(as_uuid=True),
        ForeignKey("iam.permissions.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    schema="iam",
)

Index(
    "ix_role_permissions_permission_id",
    role_permissions.c.permission_id,
)


membership_roles = Table(
    "membership_roles",
    Base.metadata,
    Column(
        "membership_id",
        PG_UUID(as_uuid=True),
        primary_key=True,
        nullable=False,
    ),
    Column(
        "role_id",
        PG_UUID(as_uuid=True),
        primary_key=True,
        nullable=False,
    ),
    Column(
        "tenant_id",
        PG_UUID(as_uuid=True),
        nullable=False,
    ),
    ForeignKeyConstraint(
        ["tenant_id", "membership_id"],
        ["iam.tenant_memberships.tenant_id", "iam.tenant_memberships.id"],
        name="fk_membership_roles_tenant_membership",
        ondelete="CASCADE",
    ),
    ForeignKeyConstraint(
        ["tenant_id", "role_id"],
        ["iam.roles.tenant_id", "iam.roles.id"],
        name="fk_membership_roles_tenant_role",
        ondelete="CASCADE",
    ),
    schema="iam",
)

Index(
    "ix_membership_roles_tenant_role",
    membership_roles.c.tenant_id,
    membership_roles.c.role_id,
)


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "status in ('active','disabled','locked')",
            name="ck_users_status",
        ),
        {"schema": "iam"},
    )

    email: Mapped[str] = mapped_column(
        String(320),
        unique=True,
        nullable=False,
    )
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    full_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        default="active",
        nullable=False,
    )

    memberships: Mapped[list["TenantMembership"]] = relationship(
        back_populates="user",
    )


class TenantMembership(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "tenant_memberships"
    __table_args__ = (
        CheckConstraint(
            "status in ('active','disabled')",
            name="ck_memberships_status",
        ),
        UniqueConstraint(
            "tenant_id",
            "user_id",
            name="uq_memberships_tenant_user",
        ),
        UniqueConstraint(
            "tenant_id",
            "id",
            name="uq_memberships_tenant_id_id",
        ),
        Index(
            "ix_memberships_user_id",
            "user_id",
        ),
        Index(
            "ix_memberships_tenant_status",
            "tenant_id",
            "status",
        ),
        {"schema": "iam"},
    )

    tenant_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(
            "platform.tenants.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(
            "iam.users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(32),
        default="active",
        nullable=False,
    )

    user: Mapped[User] = relationship(
        back_populates="memberships",
    )

    roles: Mapped[list["Role"]] = relationship(
        "Role",
        secondary=membership_roles,
        primaryjoin=lambda: (
            TenantMembership.id
            == membership_roles.c.membership_id
        ),
        secondaryjoin=lambda: and_(
            Role.id == membership_roles.c.role_id,
            Role.tenant_id == membership_roles.c.tenant_id,
        ),
    )


class Role(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "roles"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "key",
            name="uq_roles_tenant_key",
        ),
        UniqueConstraint(
            "tenant_id",
            "id",
            name="uq_roles_tenant_id_id",
        ),
        {"schema": "iam"},
    )

    tenant_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(
            "platform.tenants.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    key: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    is_system: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="false",
        nullable=False,
    )

    permissions: Mapped[list["Permission"]] = relationship(
        secondary=role_permissions,
    )


class Permission(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "permissions"
    __table_args__ = ({"schema": "iam"},)

    key: Mapped[str] = mapped_column(
        String(160),
        unique=True,
        nullable=False,
    )

    module: Mapped[str] = mapped_column(
        String(80),
        nullable=False,
    )

    action: Mapped[str] = mapped_column(
        String(80),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
