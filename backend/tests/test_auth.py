import pytest
from httpx import AsyncClient
from app.models.iam import User

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, test_user: User):
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": test_user.email, "password": "password123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient, test_user: User):
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": test_user.email, "password": "wrongpassword"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"

@pytest.mark.asyncio
async def test_read_user_me(client: AsyncClient, test_user: User):
    # First login
    login_response = await client.post(
        "/api/v1/auth/login",
        data={"username": test_user.email, "password": "password123"},
    )
    token = login_response.json()["access_token"]
    
    # Then access /me
    response = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["email"] == test_user.email
    assert response.json()["full_name"] == test_user.full_name

@pytest.mark.asyncio
async def test_read_user_memberships(client: AsyncClient, test_user: User, test_membership):
    # First login
    login_response = await client.post(
        "/api/v1/auth/login",
        data={"username": test_user.email, "password": "password123"},
    )
    token = login_response.json()["access_token"]
    
    # Then access /me/memberships
    response = await client.get(
        "/api/v1/users/me/memberships",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    memberships = response.json()
    assert len(memberships) == 1
    assert memberships[0]["tenant_id"] == str(test_membership.tenant_id)
