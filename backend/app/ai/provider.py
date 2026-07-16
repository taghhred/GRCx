"""Shared httpx client + Imtithal AI provider (connection reuse)."""
from __future__ import annotations

from typing import Any, Protocol, runtime_checkable

import httpx

from app.core.config import Settings

SAFE_AI_UNAVAILABLE = (
    "The AI Advisor is temporarily unavailable. Please try again shortly."
)

_shared_clients: dict[str, httpx.AsyncClient] = {}


def get_shared_http_client(base_url: str, timeout: float) -> httpx.AsyncClient:
    """Reuse one AsyncClient per (base_url, timeout) for connection pooling."""
    key = f"{base_url.rstrip('/')}|{timeout}"
    client = _shared_clients.get(key)
    if client is None or client.is_closed:
        client = httpx.AsyncClient(timeout=timeout)
        _shared_clients[key] = client
    return client


def _ai_auth_headers(token: str | None) -> dict[str, str]:
    if not token:
        return {}
    return {"X-GRCx-AI-Token": token}


@runtime_checkable
class LocalAIProvider(Protocol):
    name: str

    async def generate(
        self,
        messages: list[dict[str, str]],
        page_context: dict[str, str | None] | None = None,
        user_context: dict[str, str | None] | None = None,
    ) -> str: ...


class StubLocalAIProvider:
    name = "stub"

    async def generate(
        self,
        messages: list[dict[str, str]],
        page_context: dict[str, str | None] | None = None,
        user_context: dict[str, str | None] | None = None,
    ) -> str:
        module = (page_context or {}).get("moduleLabel") or "GRCx"
        last = messages[-1]["content"] if messages else ""
        first = (user_context or {}).get("first_name") or "user"
        return (
            f"[Prototype · local stub] Hi {first}. Context: {module}. "
            f"Received: {last[:240]}. "
            "No cloud AI was called. Set AI_PROVIDER=imtithal and start the AI service."
        )


class LocalHttpAIProvider:
    name = "local_http"

    def __init__(
        self,
        base_url: str,
        model: str,
        timeout: float = 60.0,
        *,
        service_token: str = "",
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout
        self.service_token = service_token

    async def generate(
        self,
        messages: list[dict[str, str]],
        page_context: dict[str, str | None] | None = None,
        user_context: dict[str, str | None] | None = None,
    ) -> str:
        system = (
            "You are GRCx local GRC assistant. Stay on governance topics. "
            f"Page context: {page_context or {}}. User: {user_context or {}}."
        )
        payload = {
            "model": self.model,
            "messages": [{"role": "system", "content": system}, *messages],
            "stream": False,
        }
        client = get_shared_http_client(self.base_url, self.timeout)
        response = await client.post(
            f"{self.base_url}/v1/chat/completions",
            json=payload,
            headers=_ai_auth_headers(self.service_token),
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


class ImtithalAIProvider:
    """Proxies chat to the Imtithal AI service (AraBERT pipeline)."""

    name = "imtithal"

    def __init__(
        self,
        base_url: str,
        timeout: float = 120.0,
        *,
        service_token: str = "",
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.service_token = service_token

    async def generate(
        self,
        messages: list[dict[str, str]],
        page_context: dict[str, str | None] | None = None,
        user_context: dict[str, str | None] | None = None,
    ) -> str:
        uc = user_context or {}
        payload: dict[str, Any] = {
            "messages": messages,
            "page_context": page_context or {},
            "user_id": uc.get("user_id"),
            "user_first_name": uc.get("first_name"),
            "user_role": uc.get("role"),
            "user_department": uc.get("department"),
        }
        client = get_shared_http_client(self.base_url, self.timeout)
        response = await client.post(
            f"{self.base_url}/api/v1/chat",
            json=payload,
            headers=_ai_auth_headers(self.service_token),
        )
        response.raise_for_status()
        data = response.json()
        reply = data.get("reply")
        if not isinstance(reply, str) or not reply.strip():
            raise ValueError("empty_ai_reply")
        return reply

    async def advisor_chat(
        self,
        message: str,
        history: list[dict[str, str]] | None = None,
        module: str | None = None,
        lang: str = "auto",
        page_context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "message": message,
            "history": history or [],
            "module": module,
            "lang": lang,
            "page_context": page_context or {},
        }
        client = get_shared_http_client(self.base_url, self.timeout)
        response = await client.post(
            f"{self.base_url}/advisor/chat",
            json=payload,
            headers=_ai_auth_headers(self.service_token),
        )
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, dict):
            raise ValueError("invalid_advisor_reply")
        return data


def build_ai_provider(settings: Settings) -> LocalAIProvider:
    token = (settings.ai_service_token or "").strip()
    if settings.ai_provider in ("raqeeb", "imtithal"):
        return ImtithalAIProvider(
            settings.ai_service_url,
            timeout=settings.ai_request_timeout_seconds,
            service_token=token,
        )
    if settings.ai_provider == "local_http":
        return LocalHttpAIProvider(
            settings.local_ai_base_url,
            settings.local_ai_model,
            timeout=settings.ai_request_timeout_seconds,
            service_token=token,
        )
    return StubLocalAIProvider()
