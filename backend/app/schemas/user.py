from datetime import datetime
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
)


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    status: str = "active"


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: str | None = None
    status: str | None = None
    password: str | None = None


class UserOut(UserBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


class RoleOut(BaseModel):
    id: UUID
    key: str
    name: str
    is_system: bool

    model_config = ConfigDict(
        from_attributes=True,
    )


class TenantMembershipOut(BaseModel):
    id: UUID
    tenant_id: UUID
    user_id: UUID
    status: str

    roles: list[RoleOut] = Field(
        default_factory=list,
    )

    model_config = ConfigDict(
        from_attributes=True,
    )
