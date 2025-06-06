import pytest
from httpx import AsyncClient, ASGITransport
from asgi_lifespan import LifespanManager
from main import app

import asyncio

@pytest.mark.asyncio
async def test_register_and_login():
    async with LifespanManager(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            # Регистрация (email+password)
            resp = await ac.post("/register", json={"email": "testuser@example.com", "password": "testpass123"})
            assert resp.status_code == 200
            # Логин (form-data)
            resp = await ac.post(
                "/token",
                data={"username": "testuser@example.com", "password": "testpass123"},
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            assert resp.status_code == 200
            data = resp.json()
            assert "access_token" in data
            access_token = data["access_token"]
            # Получение задач
            resp = await ac.get("/tasks/", headers={"Authorization": f"Bearer {access_token}"})
            assert resp.status_code == 200
            # Создание задачи
            resp = await ac.post(
                "/tasks/",
                json={"title": "test", "description": "desc"},
                headers={"Authorization": f"Bearer {access_token}"}
            )
            assert resp.status_code == 200
            # Refresh токен (query)
            refresh_token = data.get("refresh_token", "")
            resp = await ac.post(f"/token/refresh?refresh_token={refresh_token}")
            assert resp.status_code == 200
            # Revoke токен (query)
            resp = await ac.post(f"/token/revoke?token={refresh_token}")
            assert resp.status_code == 200 