from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class AuditEvent:
    action: str
    object_type: str
    object_id: UUID | None
    tenant_id: UUID | None
    actor_user_id: UUID | None
    request_id: str | None
    metadata: dict


class AuditSink:
    async def record(self, event: AuditEvent) -> None:
        raise NotImplementedError("Audit persistence is implemented in the database stage")

