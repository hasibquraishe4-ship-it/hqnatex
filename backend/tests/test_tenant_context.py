import pytest
from uuid import uuid4
from httpx import AsyncClient
from app.models.iam import User

@pytest.mark.asyncio
async def test_tenant_context_requires_auth(client: AsyncClient) -> None:
    response = await client.get("/api/v1/tenant/context")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_tenant_context_requires_header(client: AsyncClient, test_user: User) -> None:
    login_response = await client.post(
        "/api/v1/auth/login",
        data={"username": test_user.email, "password": "password123"},
    )
    token = login_response.json()["access_token"]
    
    response = await client.get(
        "/api/v1/tenant/context",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "X-Tenant-ID header is required for tenant scoped endpoints"

@pytest.mark.asyncio
async def test_tenant_context_requires_membership(client: AsyncClient, test_user: User) -> None:
    login_response = await client.post(
        "/api/v1/auth/login",
        data={"username": test_user.email, "password": "password123"},
    )
    token = login_response.json()["access_token"]
    
    tenant_id = str(uuid4())
    response = await client.get(
        "/api/v1/tenant/context",
        headers={"Authorization": f"Bearer {token}", "X-Tenant-ID": tenant_id}
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "User is not an active member of the specified tenant"

@pytest.mark.asyncio
async def test_tenant_context_accepts_uuid_and_returns_request_id(
    client: AsyncClient, test_user: User, test_tenant, test_membership
) -> None:
    login_response = await client.post(
        "/api/v1/auth/login",
        data={"username": test_user.email, "password": "password123"},
    )
    token = login_response.json()["access_token"]
    
    tenant_id = str(test_tenant.id)
    response = await client.get(
        "/api/v1/tenant/context",
        headers={"Authorization": f"Bearer {token}", "X-Tenant-ID": tenant_id}
    )

    assert response.status_code == 200
    assert response.json()["tenant_id"] == tenant_id
    assert response.json()["request_id"]

