from contextvars import ContextVar, Token
from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class TenantContext:
    tenant_id: UUID
    request_id: str


tenant_context: ContextVar[TenantContext | None] = ContextVar(
    "tenant_context",
    default=None,
)


def set_tenant_context(
    context: TenantContext,
) -> Token[TenantContext | None]:
    return tenant_context.set(context)


def reset_tenant_context(
    token: Token[TenantContext | None],
) -> None:
    tenant_context.reset(token)


def get_tenant_context() -> TenantContext | None:
    return tenant_context.get()
