from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class TenantJobContext:
    tenant_id: UUID
    actor_user_id: UUID | None
    request_id: str

