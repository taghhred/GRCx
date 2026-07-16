"""CORS / cookie security checks for Vercel ↔ Railway production."""
from __future__ import annotations

import os

from fastapi import Response
from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.core.cookies import set_auth_cookies


VERCEL_ORIGIN = "https://grcx-ashy.vercel.app"
PROD_CORS = (
    "https://grcx-ashy.vercel.app,"
    "http://localhost:5173,http://localhost:5174"
)


def test_code_default_cors_includes_vercel_and_localhost():
    """Defaults in Settings (ignoring any local .env override)."""
    default = Settings.model_fields["cors_origins"].default
    assert isinstance(default, str)
    assert VERCEL_ORIGIN in default
    assert "http://localhost:5173" in default
    assert "http://localhost:5174" in default
    assert "*" not in default


def test_options_preflight_login_allows_vercel_origin(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", PROD_CORS)
    monkeypatch.setenv("USE_SQLITE", "true")
    monkeypatch.setenv("SQLITE_PATH", "./grcx_cors_preflight_test.db")
    monkeypatch.setenv("AI_PROVIDER", "stub")
    monkeypatch.setenv("SECRET_KEY", "cors-preflight-test-secret-key-32chars")
    get_settings.cache_clear()

    from app.main import create_app

    client = TestClient(create_app())
    r = client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": VERCEL_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-grcx-csrf",
        },
    )
    assert r.status_code == 200, r.text
    assert r.headers.get("access-control-allow-origin") == VERCEL_ORIGIN
    assert r.headers.get("access-control-allow-credentials") == "true"
    allow_headers = (r.headers.get("access-control-allow-headers") or "").lower()
    assert "content-type" in allow_headers
    assert "x-grcx-csrf" in allow_headers
    get_settings.cache_clear()


def test_production_cookies_use_secure_samesite_none():
    response = Response()
    set_auth_cookies(
        response,
        access_token="access-token",
        refresh_token="refresh-token",
        access_max_age=1800,
        refresh_max_age=604800,
        secure=True,
    )
    raw_headers = [
        v.decode() if isinstance(v, (bytes, bytearray)) else str(v)
        for k, v in response.raw_headers
        if k.lower() == b"set-cookie"
    ]
    assert raw_headers, "expected Set-Cookie headers"
    joined = " | ".join(raw_headers).lower()
    assert "grcx_access=" in joined
    assert "grcx_refresh=" in joined
    assert "samesite=none" in joined
    assert "secure" in joined
    assert "httponly" in joined


def test_cors_origins_env_var_name():
    """Backend reads CORS_ORIGINS (pydantic field cors_origins)."""
    previous = os.environ.get("CORS_ORIGINS")
    os.environ["CORS_ORIGINS"] = f"{VERCEL_ORIGIN},http://localhost:5173"
    try:
        get_settings.cache_clear()
        settings = Settings()
        assert VERCEL_ORIGIN in settings.cors_origin_list
        assert "*" not in settings.cors_origin_list
    finally:
        if previous is None:
            os.environ.pop("CORS_ORIGINS", None)
        else:
            os.environ["CORS_ORIGINS"] = previous
        get_settings.cache_clear()
