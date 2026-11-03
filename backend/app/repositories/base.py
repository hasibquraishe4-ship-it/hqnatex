from typing import Generic, TypeVar
from uuid import UUID

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base

ModelT = TypeVar("ModelT", bound=Base)


class Repository(Generic[ModelT]):
    model: type[ModelT]

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def tenant_scoped_statement(self, tenant_id: UUID) -> Select[tuple[ModelT]]:
        if not hasattr(self.model, "tenant_id"):
            raise RuntimeError(f"{self.model.__name__} is not tenant scoped")
        return select(self.model).where(self.model.tenant_id == tenant_id)

    async def get(self, object_id: UUID) -> ModelT | None:
        return await self.session.get(self.model, object_id)

    async def add(self, instance: ModelT) -> ModelT:
        self.session.add(instance)
        return instance

