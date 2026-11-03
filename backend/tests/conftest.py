import os
import asyncio
from collections.abc import AsyncIterator

import pytest
import sqlalchemy as sa
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.base import Base
from app.main import create_app
from app.db.session import get_session
from app.core.security import get_password_hash
from app.models.iam import User, TenantMembership
from app.models.platform import Tenant

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://hqnatex:hqnatex@localhost:5432/hqnatex")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret")

@pytest.fixture
async def engine():
    engine = create_async_engine(os.environ["DATABASE_URL"])
    async with engine.begin() as conn:
        await conn.execute(sa.text("CREATE SCHEMA IF NOT EXISTS platform"))
        await conn.execute(sa.text("CREATE SCHEMA IF NOT EXISTS tenant"))
        await conn.execute(sa.text("CREATE SCHEMA IF NOT EXISTS iam"))
        await conn.execute(sa.text("CREATE SCHEMA IF NOT EXISTS audit"))
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()

@pytest.fixture
async def session(engine) -> AsyncIterator[AsyncSession]:
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session

@pytest.fixture
async def client(session: AsyncSession) -> AsyncIterator[AsyncClient]:
    app = create_app()
    app.dependency_overrides[get_session] = lambda: session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client

@pytest.fixture
async def test_user(session: AsyncSession) -> User:
    user = User(
        email="test@example.com",
        password_hash=get_password_hash("password123"),
        full_name="Test User",
        status="active"
    )
    session.add(user)
    await session.flush()
    return user

@pytest.fixture
async def test_tenant(session: AsyncSession) -> Tenant:
    tenant = Tenant(
        code="TEST",
        name="Test Tenant",
        status="active"
    )
    session.add(tenant)
    await session.flush()
    return tenant

@pytest.fixture
async def test_membership(session: AsyncSession, test_user: User, test_tenant: Tenant) -> TenantMembership:
    membership = TenantMembership(
        tenant_id=test_tenant.id,
        user_id=test_user.id,
        status="active"
    )
    session.add(membership)
    await session.flush()
    return membership
