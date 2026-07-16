def test_health(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_login_json_and_me_cookies(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "test@grcx.local", "password": "123456"},
    )
    assert response.status_code == 200
    tokens = response.json()
    assert "access_token" in tokens
    assert "grcx_access" in response.cookies

    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200
    body = me.json()
    assert body["email"] == "test@grcx.local"
    assert body["full_name"] == "Mohammed"
    assert body["roles"] == ["GRC Specialist"]
    assert "hashed_password" not in body


def test_login_invalid_password(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "test@grcx.local", "password": "wrong"},
    )
    assert response.status_code == 401
    assert "Invalid" in response.json()["detail"]


def test_password_is_argon2id(client):
    from app.db import session as session_mod
    from app.models.user import User

    db = session_mod.SessionLocal()
    try:
        user = db.query(User).filter(User.email == "test@grcx.local").first()
        assert user is not None
        assert user.hashed_password.startswith("$argon2id$")
    finally:
        db.close()


def test_refresh_rotates_session(client):
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "test@grcx.local", "password": "123456"},
    )
    assert login.status_code == 200
    refreshed = client.post("/api/v1/auth/refresh", json={})
    assert refreshed.status_code == 200
    assert "access_token" in refreshed.json()


def test_ai_chat_stub(client):
    client.post(
        "/api/v1/auth/login",
        json={"email": "test@grcx.local", "password": "123456"},
    )
    response = client.post(
        "/api/v1/ai/chat",
        json={
            "messages": [{"role": "user", "content": "Explain residual risk"}],
            "page_context": {"moduleLabel": "Risk Assessment"},
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "stub"
    assert data["prototype"] is True
    assert "Risk Assessment" in data["reply"]


def test_cases_crud(client):
    client.post(
        "/api/v1/auth/login",
        json={"email": "test@grcx.local", "password": "123456"},
    )

    created = client.post(
        "/api/v1/cases",
        json={
            "case_id": "GRC-TEST-1",
            "title": "Test SOAR case",
            "severity": "High",
            "status": "New",
        },
    )
    assert created.status_code == 201

    listed = client.get("/api/v1/cases")
    assert listed.status_code == 200
    assert any(c["case_id"] == "GRC-TEST-1" for c in listed.json())
