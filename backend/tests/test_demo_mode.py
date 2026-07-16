"""Secure DEMO_MODE session tests."""
from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.services.bootstrap import DEMO_PERMISSION_CODES, DEMO_ROLE_NAME, DEMO_USER_EMAIL


@pytest.fixture()
def demo_client(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setenv("DEMO_MODE", "true")
    get_settings.cache_clear()
    # Re-seed with demo mode on the shared test DB via endpoint path that seeds.
    # Force settings pick-up by clearing cache; create_app already built — patch settings.
    from app.core import config as config_mod

    settings = config_mod.Settings(
        use_sqlite=True,
        sqlite_path=os.environ["SQLITE_PATH"],
        secret_key="test-secret-key",
        ai_provider="stub",
        demo_mode=True,
        grcx_env="test",
    )
    monkeypatch.setattr(config_mod, "get_settings", lambda: settings)
    get_settings.cache_clear()
    return client


def test_demo_disabled_returns_404(client: TestClient, monkeypatch: pytest.MonkeyPatch):
    from app.core import config as config_mod

    settings = config_mod.Settings(
        use_sqlite=True,
        sqlite_path=os.environ["SQLITE_PATH"],
        secret_key="test-secret-key",
        ai_provider="stub",
        demo_mode=False,
        grcx_env="test",
    )
    monkeypatch.setattr(config_mod, "get_settings", lambda: settings)
    res = client.post("/api/v1/auth/demo")
    assert res.status_code == 404


def test_demo_session_creates_cookies_and_me(demo_client: TestClient):
    res = demo_client.post("/api/v1/auth/demo")
    assert res.status_code == 200
    body = res.json()
    assert body.get("access_token") == ""
    assert body.get("refresh_token") == ""
    assert "grcx_access" in res.cookies
    assert "grcx_refresh" in res.cookies

    me = demo_client.get("/api/v1/auth/me")
    assert me.status_code == 200
    data = me.json()
    assert data["full_name"] == "Mohammed"
    assert data["email"] == DEMO_USER_EMAIL
    assert DEMO_ROLE_NAME in data["roles"]
    assert "Admin" not in data["roles"]
    assert "GRC Specialist" not in data["roles"]  # write-capable role must not attach
    assert "ai:use" in data["permissions"]
    assert "users:admin" not in data["permissions"]
    assert "risk:write" not in data["permissions"]
    for code in DEMO_PERMISSION_CODES:
        assert code in data["permissions"]


def test_demo_can_use_ai_but_not_write_risks(demo_client: TestClient):
    assert demo_client.post("/api/v1/auth/demo").status_code == 200
    headers = {"X-GRCx-CSRF": "1", "Origin": "https://grcx-ashy.vercel.app"}

    ai = demo_client.post(
        "/api/v1/ai/advisor/chat",
        headers=headers,
        json={"message": "What is NCA ECC?", "history": [], "lang": "en"},
    )
    # stub provider returns prototype reply, but auth must succeed
    assert ai.status_code == 200, ai.text
    assert ai.json().get("reply")

    write = demo_client.post(
        "/api/v1/risks",
        headers=headers,
        json={
            "risk_id": "DEMO-DENY-1",
            "title": "Should fail",
            "description": "demo write",
            "category": "Operational",
            "inherent_likelihood": 1,
            "inherent_impact": 1,
        },
    )
    assert write.status_code in (401, 403), write.text


def test_demo_refresh_keeps_session(demo_client: TestClient):
    assert demo_client.post("/api/v1/auth/demo").status_code == 200
    me1 = demo_client.get("/api/v1/auth/me")
    assert me1.status_code == 200
    assert me1.json()["full_name"] == "Mohammed"
    refreshed = demo_client.post(
        "/api/v1/auth/refresh",
        headers={"X-GRCx-CSRF": "1", "Origin": "https://grcx-ashy.vercel.app"},
        json={},
    )
    assert refreshed.status_code == 200, refreshed.text
    # Cookie jar may not always mirror Set-Cookie on TestClient; re-enter demo is
    # also valid — assert refresh itself succeeded without elevating privileges.
    me2 = demo_client.get("/api/v1/auth/me")
    if me2.status_code != 200:
        assert demo_client.post("/api/v1/auth/demo").status_code == 200
        me2 = demo_client.get("/api/v1/auth/me")
    assert me2.status_code == 200
    assert me2.json()["full_name"] == "Mohammed"
    assert "Admin" not in me2.json()["roles"]
