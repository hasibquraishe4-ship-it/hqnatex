from collections.abc import AsyncIterator
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.context import (
    TenantContext,
    reset_tenant_context,
    set_tenant_context,
)
from app.core.security import ALGORITHM
from app.db.session import get_session
from app.models.iam import TenantMembership, User
from app.schemas.auth import TokenData


settings = get_settings()

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.api_v1_prefix}/auth/login"
)


async def get_current_user(
    session: Annotated[AsyncSession, Depends(get_session)],
    token: Annotated[str, Depends(oauth2_scheme)],
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[ALGORITHM],
        )

        subject = payload.get("sub")

        if not isinstance(subject, str):
            raise credentials_exception

        token_data = TokenData(
            user_id=UUID(subject),
        )

    except HTTPException:
        raise
    except (JWTError, ValueError, TypeError, AttributeError):
        raise credentials_exception

    if token_data.user_id is None:
        raise credentials_exception

    stmt = select(User).where(
        User.id == token_data.user_id
    )

    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    return user


async def get_current_active_user(
    current_user: Annotated[
        User,
        Depends(get_current_user),
    ],
) -> User:
    if current_user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is not active",
        )

    return current_user


async def require_tenant_context(
    request: Request,
    current_user: Annotated[
        User,
        Depends(get_current_active_user),
    ],
    session: Annotated[
        AsyncSession,
        Depends(get_session),
    ],
    x_tenant_id: str | None = Header(
        default=None,
        alias="X-Tenant-ID",
    ),
) -> AsyncIterator[TenantContext]:
    if not x_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "X-Tenant-ID header is required "
                "for tenant scoped endpoints"
            ),
        )

    try:
        tenant_id = UUID(x_tenant_id)
    except (ValueError, TypeError, AttributeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Tenant-ID must be a valid UUID",
        ) from exc

    stmt = select(TenantMembership).where(
        TenantMembership.tenant_id == tenant_id,
        TenantMembership.user_id == current_user.id,
        TenantMembership.status == "active",
    )

    result = await session.execute(stmt)
    membership = result.scalar_one_or_none()

    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "User is not an active member "
                "of the specified tenant"
            ),
        )

    context = TenantContext(
        tenant_id=tenant_id,
        request_id=request.state.request_id,
    )

    token = set_tenant_context(context)

    try:
        yield context
    finally:
        reset_tenant_context(token)
