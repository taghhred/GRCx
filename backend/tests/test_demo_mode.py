"""Hackathon DEMO_MODE open-access tests."""
from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.services.bootstrap import DEMO_USER_EMAIL


@pytest.fixture()
def demo_client(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> TestClient:
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


def test_open_access_me_without_cookies(demo_client: TestClient):
    me = demo_client.get("/api/v1/auth/me")
    assert me.status_code == 200, me.text
    data = me.json()
    assert data["full_name"] == "Mohammed"
    assert data["email"] == DEMO_USER_EMAIL
    assert "Admin" in data["roles"]


def test_open_access_ai_without_cookies(demo_client: TestClient):
    ai = demo_client.post(
        "/api/v1/ai/advisor/chat",
        headers={"X-GRCx-CSRF": "1", "Origin": "https://grcx-ashy.vercel.app"},
        json={"message": "What is NCA ECC?", "history": [], "lang": "en"},
    )
    assert ai.status_code == 200, ai.text
    assert ai.json().get("reply")


def test_demo_disabled_requires_auth(client: TestClient, monkeypatch: pytest.MonkeyPatch):
    from app.core import config as config_mod
    from app.core import deps as deps_mod

    settings = config_mod.Settings(
        use_sqlite=True,
        sqlite_path=os.environ["SQLITE_PATH"],
        secret_key="test-secret-key",
        ai_provider="stub",
        demo_mode=False,
        grcx_env="test",
    )
    monkeypatch.setattr(config_mod, "get_settings", lambda: settings)
    monkeypatch.setattr(deps_mod, "get_settings", lambda: settings)
    get_settings.cache_clear()
    me = client.get("/api/v1/auth/me")
    assert me.status_code == 401
