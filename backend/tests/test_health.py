import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_live_health_returns_service_status(client: AsyncClient) -> None:
    response = await client.get("/api/v1/health/live")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["service"] == "HQNATEX"
    assert "X-Request-ID" in response.headers

