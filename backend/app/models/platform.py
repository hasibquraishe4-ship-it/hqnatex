from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class Tenant(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "tenants"
    __table_args__ = (
        CheckConstraint("status in ('draft','active','suspended','closed')", name="ck_tenants_status"),
        {"schema": "platform"},
    )

    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="draft", nullable=False)

    companies: Mapped[list["Company"]] = relationship(back_populates="tenant")


class Company(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "companies"
    __table_args__ = (
        CheckConstraint("status in ('active','inactive')", name="ck_companies_status"),
        UniqueConstraint("tenant_id", "legal_name", name="uq_companies_tenant_legal_name"),
        Index("ix_companies_tenant_status", "tenant_id", "status"),
        {"schema": "tenant"},
    )

    tenant_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("platform.tenants.id", ondelete="RESTRICT"),
        nullable=False,
    )
    legal_name: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    tin: Mapped[str | None] = mapped_column(String(64), nullable=True)
    license_no: Mapped[str | None] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)

    tenant: Mapped[Tenant] = relationship(back_populates="companies")
