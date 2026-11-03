from uuid import UUID

from pydantic import BaseModel


class TenantContextResponse(BaseModel):
    tenant_id: UUID
    request_id: str

