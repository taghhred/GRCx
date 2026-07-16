"""Unit tests for native Ollama (local_http) provider — mocked HTTP."""
from __future__ import annotations

import json

import httpx
import pytest

from app.ai import provider as provider_mod
from app.ai.provider import OllamaAIProvider, build_ai_provider, model_missing_message
from app.core.config import Settings


OLLAMA = "http://ollama.railway.internal:11434"
MODEL = "qwen2.5:3b"


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
async def test_missing_model_clear_message():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/tags":
            return httpx.Response(200, json={"models": [{"name": "llama3.2:1b"}]})
        return httpx.Response(500)

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler), timeout=5.0)
    provider_mod._shared_clients[f"{OLLAMA}|5.0"] = client
    provider = OllamaAIProvider(OLLAMA, MODEL, timeout=5.0)
    with pytest.raises(LookupError) as exc:
        await provider.generate([{"role": "user", "content": "Hi"}])
    assert str(exc.value) == model_missing_message(MODEL)
    await client.aclose()


@pytest.mark.asyncio
async def test_advisor_chat_multiturn():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/tags":
            return httpx.Response(200, json={"models": [{"name": MODEL}]})
        if request.url.path == "/api/chat":
            body = json.loads(request.content.decode())
            assert any(m.get("content") == "Hi" for m in body["messages"])
            assert body["messages"][-1]["content"] == "What is NCA ECC?"
            return httpx.Response(
                200,
                json={
                    "message": {
                        "role": "assistant",
                        "content": "NCA ECC covers cybersecurity controls.",
                    },
                    "done": True,
                },
            )
        return httpx.Response(404)

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler), timeout=5.0)
    provider_mod._shared_clients[f"{OLLAMA}|5.0"] = client
    provider = OllamaAIProvider(OLLAMA, MODEL, timeout=5.0)
    data = await provider.advisor_chat(
        message="What is NCA ECC?",
        history=[
            {"role": "user", "content": "Hi"},
            {"role": "assistant", "content": "Hello"},
        ],
        module="Compliance",
    )
    assert "NCA ECC" in data["reply"]
    assert data["model"] == MODEL
    assert data["provider"] == "local_http"
    assert data["grounded"] is False
    await client.aclose()


def test_build_provider_reads_ollama_env_names():
    settings = Settings(
        ai_provider="local_http",
        ollama_base_url=OLLAMA,
        ollama_model=MODEL,
        local_ai_base_url="",
        local_ai_model="",
    )
    provider = build_ai_provider(settings)
    assert isinstance(provider, OllamaAIProvider)
    assert provider.base_url == OLLAMA
    assert provider.model == MODEL
