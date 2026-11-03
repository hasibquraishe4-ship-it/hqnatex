from datetime import datetime, timedelta, timezone
from typing import Any, Union
from uuid import UUID

import bcrypt
from fastapi import HTTPException, status
from jose import jwt

from app.core.config import get_settings

settings = get_settings()

ALGORITHM = "HS256"


def create_access_token(subject: Union[str, Any], expires_delta: Union[timedelta, None] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=ALGORITHM)
    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


class PermissionDependency:
    def __init__(self, permission: str) -> None:
        self.permission = permission

    async def __call__(self) -> None:
        # This will be fully implemented when RBAC logic is added to the database session
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=f"Permission enforcement for {self.permission} is not implemented in this stage",
        )


def require_permission(permission: str) -> PermissionDependency:
    return PermissionDependency(permission)

