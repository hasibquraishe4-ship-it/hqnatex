from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import ALGORITHM
from app.main import create_app
from app.models.iam import (
    Role,
    TenantMembership,
    User,
    membership_roles,
)


async def login(
    client: AsyncClient,
    email: str,
    password: str = "password123",
) -> str:
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": email,
            "password": password,
        },
    )

    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_password_setup_is_not_exposed(
    client: AsyncClient,
) -> None:
    response = await client.post(
        "/api/v1/auth/password-setup",
        json={
            "token": "unused",
            "new_password": "new-password",
        },
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_invalid_tokens_return_401(
    client: AsyncClient,
) -> None:
    response = await client.get(
        "/api/v1/users/me",
        headers={
            "Authorization": "Bearer invalid-token"
        },
    )

    assert response.status_code == 401

    settings = get_settings()

    token_without_subject = jwt.encode(
        {
            "exp": (
                datetime.now(timezone.utc)
                + timedelta(minutes=5)
            ),
        },
        settings.jwt_secret_key,
        algorithm=ALGORITHM,
    )

    response = await client.get(
        "/api/v1/users/me",
        headers={
            "Authorization": f"Bearer {token_without_subject}"
        },
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_disabled_user_login_is_forbidden(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
) -> None:
    test_user.status = "disabled"
    await session.flush()

    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": test_user.email,
            "password": "password123",
        },
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "User account is not active"


@pytest.mark.asyncio
async def test_inactive_membership_is_forbidden(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    test_tenant,
    test_membership: TenantMembership,
) -> None:
    token = await login(
        client,
        test_user.email,
    )

    test_membership.status = "disabled"
    await session.flush()

    response = await client.get(
        "/api/v1/tenant/context",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Tenant-ID": str(test_tenant.id),
        },
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_membership_roles_serialize_as_objects(
    client: AsyncClient,
    session: AsyncSession,
    test_user: User,
    test_membership: TenantMembership,
) -> None:
    role = Role(
        tenant_id=test_membership.tenant_id,
        key="viewer",
        name="Viewer",
        is_system=False,
    )

    session.add(role)
    await session.flush()

    await session.execute(
        membership_roles.insert().values(
            tenant_id=test_membership.tenant_id,
            membership_id=test_membership.id,
            role_id=role.id,
        )
    )

    await session.flush()

    token = await login(
        client,
        test_user.email,
    )

    response = await client.get(
        "/api/v1/users/me/memberships",
        headers={
            "Authorization": f"Bearer {token}"
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 1
    assert len(data[0]["roles"]) == 1
    assert data[0]["roles"][0]["key"] == "viewer"
    assert data[0]["roles"][0]["name"] == "Viewer"
    assert data[0]["roles"][0]["is_system"] is False


def test_openapi_stage2_contract() -> None:
    schema = create_app().openapi()
    paths = schema["paths"]

    expected = {
        "/api/v1/auth/login",
        "/api/v1/health/live",
        "/api/v1/tenant/context",
        "/api/v1/users/me",
        "/api/v1/users/me/memberships",
    }

    for path in expected:
        assert path in paths

    assert "/api/v1/auth/password-setup" not in paths
