from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.iam import User, TenantMembership
from app.repositories.base import Repository

class UserRepository(Repository[User]):
    model = User

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

class TenantMembershipRepository(Repository[TenantMembership]):
    model = TenantMembership

    async def get_for_user(self, user_id: UUID) -> list[TenantMembership]:
        stmt = select(TenantMembership).where(TenantMembership.user_id == user_id).options(selectinload(TenantMembership.roles))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
