"""Unit tests for native Ollama (local_http) provider — mocked HTTP."""
from __future__ import annotations

import json

import httpx
import pytest

from app.ai import provider as provider_mod
from app.ai.provider import (
    DEFAULT_OLLAMA_MODEL,
    OllamaAIProvider,
    build_ai_provider,
    model_missing_message,
)
from app.core.config import Settings


OLLAMA = "http://ollama.railway.internal:11434"
MODEL = "qwen2.5:0.5b"


@pytest.fixture(autouse=True)
def _clear_shared_clients():
    provider_mod._shared_clients.clear()
    yield
    provider_mod._shared_clients.clear()


@pytest.mark.asyncio
async def test_ollama_chat_uses_api_chat_not_openai_schema():
    seen: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(f"{request.method} {request.url.path}")
        if request.url.path == "/api/tags":
            return httpx.Response(200, json={"models": [{"name": MODEL}]})
        if request.url.path == "/api/chat":
            body = json.loads(request.content.decode())
            assert body["model"] == MODEL
            assert body["stream"] is False
            assert body["messages"][0]["role"] == "system"
            assert body["messages"][-1]["content"] == "Hello"
            return httpx.Response(
                200,
                json={
                    "model": MODEL,
                    "message": {"role": "assistant", "content": "Hello from Ollama"},
                    "done": True,
                },
            )
        return httpx.Response(404, json={"error": "unexpected"})

    transport = httpx.MockTransport(handler)
    client = httpx.AsyncClient(transport=transport, timeout=5.0)
    provider_mod._shared_clients[f"{OLLAMA}|5.0"] = client

    provider = OllamaAIProvider(OLLAMA, MODEL, timeout=5.0)
    reply = await provider.generate(
        [{"role": "user", "content": "Hello"}],
        {"moduleLabel": "Dashboard"},
        {"first_name": "Mohammed"},
    )
    assert reply == "Hello from Ollama"
    assert "POST /api/chat" in seen
    assert "GET /api/tags" in seen
    assert not any("/v1/chat/completions" in s for s in seen)
    await client.aclose()


@pytest.mark.asyncio
async def test_prefers_installed_1_5b_over_missing_configured():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/tags":
            return httpx.Response(
                200, json={"models": [{"name": "qwen2.5:1.5b"}]}
            )
        if request.url.path == "/api/chat":
            body = json.loads(request.content.decode())
            assert body["model"] == "qwen2.5:1.5b"
            return httpx.Response(
                200,
                json={
                    "message": {"role": "assistant", "content": "ok from 1.5b"},
                    "done": True,
                },
            )
        return httpx.Response(500)

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler), timeout=5.0)
    provider_mod._shared_clients[f"{OLLAMA}|5.0"] = client
    provider = OllamaAIProvider(OLLAMA, "qwen2.5:0.5b", timeout=5.0)
    reply = await provider.generate([{"role": "user", "content": "Hi"}])
    assert reply == "ok from 1.5b"
    assert provider.model == "qwen2.5:1.5b"
    await client.aclose()


@pytest.mark.asyncio
async def test_auto_pull_when_model_missing(monkeypatch):
    tags_calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/tags":
            tags_calls["n"] += 1
            if tags_calls["n"] <= 1:
                return httpx.Response(200, json={"models": []})
            return httpx.Response(200, json={"models": [{"name": MODEL}]})
        if request.url.path == "/api/pull":
            body = json.loads(request.content.decode())
            assert body["name"] == MODEL
            assert body["stream"] is False
            return httpx.Response(200, json={"status": "success"})
        if request.url.path == "/api/chat":
            return httpx.Response(
                200,
                json={
                    "message": {"role": "assistant", "content": "pulled-ok"},
                    "done": True,
                },
            )
        return httpx.Response(404)

    transport = httpx.MockTransport(handler)
    shared = httpx.AsyncClient(transport=transport, timeout=5.0)
    provider_mod._shared_clients[f"{OLLAMA}|5.0"] = shared
    original_async_client = httpx.AsyncClient

    def _client_factory(*args, **kwargs):
        kwargs = dict(kwargs)
        kwargs["transport"] = transport
        return original_async_client(*args, **kwargs)

    monkeypatch.setattr(httpx, "AsyncClient", _client_factory)
    provider = OllamaAIProvider(OLLAMA, MODEL, timeout=5.0)
    reply = await provider.generate([{"role": "user", "content": "Hi"}])
    assert reply == "pulled-ok"
    assert provider.model == MODEL
    await shared.aclose()


@pytest.mark.asyncio
async def test_pull_failure_clear_message(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/tags":
            return httpx.Response(200, json={"models": []})
        if request.url.path == "/api/pull":
            return httpx.Response(500, text="pull failed")
        return httpx.Response(404)

    transport = httpx.MockTransport(handler)
    shared = httpx.AsyncClient(transport=transport, timeout=5.0)
    provider_mod._shared_clients[f"{OLLAMA}|5.0"] = shared
    original_async_client = httpx.AsyncClient

    def _client_factory(*args, **kwargs):
        kwargs = dict(kwargs)
        kwargs["transport"] = transport
        return original_async_client(*args, **kwargs)

    monkeypatch.setattr(httpx, "AsyncClient", _client_factory)
    provider = OllamaAIProvider(OLLAMA, MODEL, timeout=5.0)
    with pytest.raises(LookupError) as exc:
        await provider.generate([{"role": "user", "content": "Hi"}])
    assert str(exc.value) == model_missing_message(MODEL)
    await shared.aclose()


@pytest.mark.asyncio
async def test_auto_downgrade_from_heavy_3b_to_pull_0_5b(monkeypatch):
    tags_calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/tags":
            tags_calls["n"] += 1
            # 3b is "installed" but we must not use it; after pull, 0.5b appears
            if tags_calls["n"] <= 1:
                return httpx.Response(
                    200, json={"models": [{"name": "qwen2.5:3b"}]}
                )
            return httpx.Response(
                200,
                json={
                    "models": [
                        {"name": "qwen2.5:3b"},
                        {"name": MODEL},
                    ]
                },
            )
        if request.url.path == "/api/pull":
            body = json.loads(request.content.decode())
            assert body["name"] == MODEL
            return httpx.Response(200, json={"status": "success"})
        if request.url.path == "/api/chat":
            body = json.loads(request.content.decode())
            assert body["model"] == MODEL
            return httpx.Response(
                200,
                json={
                    "message": {"role": "assistant", "content": "light-ok"},
                    "done": True,
                },
            )
        return httpx.Response(404)

    transport = httpx.MockTransport(handler)
    shared = httpx.AsyncClient(transport=transport, timeout=5.0)
    provider_mod._shared_clients[f"{OLLAMA}|5.0"] = shared
    original_async_client = httpx.AsyncClient

    def _client_factory(*args, **kwargs):
        kwargs = dict(kwargs)
        kwargs["transport"] = transport
        return original_async_client(*args, **kwargs)

    monkeypatch.setattr(httpx, "AsyncClient", _client_factory)
    provider = OllamaAIProvider(OLLAMA, "qwen2.5:3b", timeout=5.0)
    reply = await provider.generate([{"role": "user", "content": "Hi"}])
    assert reply == "light-ok"
    assert provider.model == MODEL
    await shared.aclose()


@pytest.mark.asyncio
async def test_advisor_chat_multiturn():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/tags":
            return httpx.Response(200, json={"models": [{"name": MODEL}]})
        if request.url.path == "/api/chat":
            body = json.loads(request.content.decode())
            assert body["stream"] is False
            assert body["options"]["num_predict"] == 120
            assert body["options"]["temperature"] == 0.1
            assert body["keep_alive"] == "30m"
            # Grounded prompt includes approved context + user question
            user_blob = " ".join(
                m.get("content", "") for m in body["messages"] if m.get("role") == "user"
            )
            assert "NCA ECC" in user_blob or "Approved context" in user_blob
            return httpx.Response(
                200,
                json={
                    "message": {
                        "role": "assistant",
                        "content": "NCA ECC covers cybersecurity controls [doc1].",
                    },
                    "done": True,
                },
            )
        return httpx.Response(404)

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler), timeout=5.0)
    provider_mod._shared_clients[f"{OLLAMA}|5.0"] = client
    provider = OllamaAIProvider(OLLAMA, MODEL, timeout=5.0)
    provider._model_ready = True
    data = await provider.advisor_chat(
        message="What are NCA ECC cybersecurity control requirements?",
        history=[
            {"role": "user", "content": "Hi"},
            {"role": "assistant", "content": "Hello"},
        ],
        module="Compliance",
    )
    assert data["provider"] == "local_http"
    assert data["grounded"] is True or data["reply"]
    assert data.get("refused") is False
    await client.aclose()


def test_build_provider_default_is_light_model():
    settings = Settings(
        ai_provider="local_http",
        ollama_base_url=OLLAMA,
        ollama_model="",
        local_ai_base_url="",
        local_ai_model="",
    )
    provider = build_ai_provider(settings)
    assert isinstance(provider, OllamaAIProvider)
    assert provider.model == DEFAULT_OLLAMA_MODEL
