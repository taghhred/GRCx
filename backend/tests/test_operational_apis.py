"""Smoke tests for new operational APIs (requires running app or TestClient)."""
from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def _login() -> None:
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "test@grcx.local", "password": "123456"},
        headers={"Origin": "http://localhost:5173"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("access_token") == ""
    assert body.get("refresh_token") == ""


def test_health():
    assert client.get("/api/v1/health").status_code == 200


def test_modules_require_auth():
    assert client.get("/api/v1/dashboard/analytics").status_code == 401


def test_modules_after_login():
    _login()
    for path in (
        "/api/v1/dashboard/analytics",
        "/api/v1/dashboard/kpis",
        "/api/v1/compliance/assets",
        "/api/v1/compliance/bundle",
        "/api/v1/identity/monitoring",
        "/api/v1/bcm/dashboard",
        "/api/v1/dr/dashboard",
        "/api/v1/reports",
    ):
        r = client.get(path)
        assert r.status_code == 200, f"{path} -> {r.status_code} {r.text[:200]}"
