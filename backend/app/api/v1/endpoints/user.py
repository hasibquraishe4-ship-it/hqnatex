from typing import Annotated, List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_active_user, get_session
from app.models.iam import User
from app.repositories.iam import TenantMembershipRepository
from app.schemas.user import UserOut, TenantMembershipOut

router = APIRouter()

@router.get("/me", response_model=UserOut)
async def read_user_me(
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    return current_user

@router.get("/me/memberships", response_model=List[TenantMembershipOut])
async def read_user_memberships(
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    repo = TenantMembershipRepository(session)
    memberships = await repo.get_for_user(current_user.id)
    return memberships
