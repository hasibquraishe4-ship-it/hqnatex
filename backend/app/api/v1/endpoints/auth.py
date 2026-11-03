from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import create_access_token, verify_password
from app.db.session import get_session
from app.repositories.iam import UserRepository
from app.schemas.auth import Token


router = APIRouter()
settings = get_settings()


@router.post("/login", response_model=Token)
async def login(
    session: Annotated[
        AsyncSession,
        Depends(get_session),
    ],
    form_data: Annotated[
        OAuth2PasswordRequestForm,
        Depends(),
    ],
) -> Token:
    repo = UserRepository(session)
    user = await repo.get_by_email(form_data.username)

    if (
        user is None
        or not verify_password(
            form_data.password,
            user.password_hash,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is not active",
        )

    access_token = create_access_token(
        subject=user.id,
        expires_delta=timedelta(
            minutes=settings.access_token_expire_minutes
        ),
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
    )
