from fastapi import APIRouter, Depends

from app.api.dependencies import require_tenant_context
from app.core.context import TenantContext
from app.schemas.tenant import TenantContextResponse

router = APIRouter()


@router.get("/context", response_model=TenantContextResponse)
async def context(context: TenantContext = Depends(require_tenant_context)) -> TenantContextResponse:
    return TenantContextResponse(
        tenant_id=context.tenant_id,
        request_id=context.request_id,
    )

