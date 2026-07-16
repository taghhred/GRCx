"""Local AI providers — Ollama (local_http) and Imtithal AI service."""
from __future__ import annotations

import logging
from typing import Any, Protocol, runtime_checkable

import httpx

from app.core.config import Settings

logger = logging.getLogger("grcx.ai")

SAFE_AI_UNAVAILABLE = (
    "The AI Advisor is temporarily unavailable. Please try again shortly."
)

_shared_clients: dict[str, httpx.AsyncClient] = {}


def get_shared_http_client(base_url: str, timeout: float) -> httpx.AsyncClient:
    """Reuse one AsyncClient per (base_url, timeout) for connection pooling."""
    key = f"{base_url.rstrip('/')}|{timeout}"
    client = _shared_clients.get(key)
    if client is None or client.is_closed:
        # HTTP/1.1 only — avoids intermittent HTTP/2 issues on private meshes.
        client = httpx.AsyncClient(
            timeout=httpx.Timeout(timeout, connect=15.0),
            http2=False,
            trust_env=False,
        )
        _shared_clients[key] = client
    return client


def _ai_auth_headers(token: str | None) -> dict[str, str]:
    if not token:
        return {}
    return {"X-GRCx-AI-Token": token}


def model_missing_message(model: str) -> str:
    return f"Configured Ollama model {model} is not available."


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
            "No cloud AI was called. Set AI_PROVIDER=local_http with Ollama."
        )


class OllamaAIProvider:
    """Native Ollama client (/api/tags, /api/chat, /api/generate).

    Does not use OpenAI-compatible /v1/chat/completions.
    """

    name = "local_http"

    def __init__(
        self,
        base_url: str,
        model: str,
        timeout: float = 120.0,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = (model or "").strip() or "qwen2.5:3b"
        self.timeout = timeout

    def _client(self) -> httpx.AsyncClient:
        return get_shared_http_client(self.base_url, self.timeout)

    async def list_models(self) -> list[str]:
        response = await self._client().get(f"{self.base_url}/api/tags")
        response.raise_for_status()
        data = response.json()
        names: list[str] = []
        for item in data.get("models") or []:
            name = (item.get("name") or item.get("model") or "").strip()
            if name:
                names.append(name)
        return names

    async def model_available(self) -> bool:
        names = await self.list_models()
        return self.model in names

    async def ensure_model(self) -> None:
        try:
            names = await self.list_models()
        except Exception as exc:  # noqa: BLE001
            raise ConnectionError(f"ollama_unreachable:{exc.__class__.__name__}") from exc
        if self.model not in names:
            raise LookupError(model_missing_message(self.model))

    async def _chat(self, messages: list[dict[str, str]]) -> str:
        await self.ensure_model()
        client = self._client()
        # Keep context small for Railway memory limits on qwen2.5:3b.
        options = {"temperature": 0.4, "num_ctx": 2048, "num_predict": 384}
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "keep_alive": "10m",
            "options": options,
        }
        try:
            response = await client.post(f"{self.base_url}/api/chat", json=payload)
            if response.status_code >= 400:
                err_preview = (response.text or "")[:180].replace("\n", " ")
                logger.warning(
                    "ollama_chat_http status=%s body=%s",
                    response.status_code,
                    err_preview,
                )
            response.raise_for_status()
            data = response.json()
            message = data.get("message") or {}
            content = message.get("content") if isinstance(message, dict) else None
            if isinstance(content, str) and content.strip():
                return content.strip()
            alt = data.get("response")
            if isinstance(alt, str) and alt.strip():
                return alt.strip()
            logger.warning("ollama_chat empty_reply keys=%s", sorted(data.keys())[:12])
        except httpx.HTTPStatusError as exc:
            logger.warning(
                "ollama_chat_http status=%s falling_back_to_generate",
                exc.response.status_code,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "ollama_chat_error type=%s falling_back_to_generate",
                exc.__class__.__name__,
            )

        # Native /api/generate fallback (still Ollama-only, no cloud).
        prompt_parts: list[str] = []
        for turn in messages:
            role = turn.get("role", "user")
            text = (turn.get("content") or "").strip()
            if not text:
                continue
            prompt_parts.append(f"{role.upper()}: {text}")
        prompt_parts.append("ASSISTANT:")
        gen_payload = {
            "model": self.model,
            "prompt": "\n".join(prompt_parts),
            "stream": False,
            "keep_alive": "10m",
            "options": options,
        }
        response = await client.post(f"{self.base_url}/api/generate", json=gen_payload)
        if response.status_code >= 400:
            err_preview = (response.text or "")[:180].replace("\n", " ")
            logger.warning(
                "ollama_generate_http status=%s body=%s",
                response.status_code,
                err_preview,
            )
        response.raise_for_status()
        data = response.json()
        content = data.get("response")
        if isinstance(content, str) and content.strip():
            return content.strip()
        raise ValueError("empty_ollama_reply")

    async def probe(self, *, deep: bool = False) -> dict[str, Any]:
        """Safe diagnostics payload (no secrets / no prompts).

        deep=True also verifies POST /api/generate (may load the model).
        """
        result: dict[str, Any] = {
            "provider": self.name,
            "model": self.model,
            "host": self.base_url,
            "reachable": False,
            "model_present": False,
            "generate_ok": None,
        }
        try:
            names = await self.list_models()
            result["reachable"] = True
            result["model_present"] = self.model in names
        except Exception:  # noqa: BLE001
            return result
        if not deep or not result["model_present"]:
            return result
        try:
            response = await self._client().post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": "ping",
                    "stream": False,
                    "options": {"num_predict": 4},
                },
            )
            result["generate_ok"] = response.status_code == 200 and bool(
                (response.json() or {}).get("response")
            )
            if response.status_code != 200:
                logger.warning("ollama_generate_probe status=%s", response.status_code)
        except Exception as exc:  # noqa: BLE001
            logger.warning("ollama_generate_probe error=%s", exc.__class__.__name__)
            result["generate_ok"] = False
        return result

    def _system_prompt(
        self,
        page_context: dict[str, str | None] | None,
        user_context: dict[str, str | None] | None,
    ) -> str:
        module = (page_context or {}).get("moduleLabel") or "GRCx"
        first = (user_context or {}).get("first_name") or "user"
        role = (user_context or {}).get("role") or "specialist"
        return (
            "You are GRCx AI Advisor, a Governance, Risk & Compliance assistant "
            "for Saudi regulatory frameworks (NCA ECC, SAMA, PDPL, and related controls). "
            "Answer clearly and practically. Do not invent citations. "
            f"User: {first} ({role}). Current module context: {module}."
        )

    async def generate(
        self,
        messages: list[dict[str, str]],
        page_context: dict[str, str | None] | None = None,
        user_context: dict[str, str | None] | None = None,
    ) -> str:
        system = self._system_prompt(page_context, user_context)
        chat_messages = [{"role": "system", "content": system}, *messages]
        return await self._chat(chat_messages)

    async def advisor_chat(
        self,
        message: str,
        history: list[dict[str, str]] | None = None,
        module: str | None = None,
        lang: str = "auto",
        page_context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        ctx = dict(page_context or {})
        if module and not ctx.get("moduleLabel"):
            ctx["moduleLabel"] = module
        system = self._system_prompt(ctx, None)
        if lang and lang not in ("auto", ""):
            system += f" Reply in language code: {lang}."

        messages: list[dict[str, str]] = [{"role": "system", "content": system}]
        for turn in (history or [])[-12:]:
            role = turn.get("role") or "user"
            content = (turn.get("content") or "").strip()
            if content and role in ("user", "assistant", "system"):
                messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": message})

        reply = await self._chat(messages)
        return {
            "reply": reply,
            "sources": [],
            "grounded": False,
            "refused": False,
            "model": self.model,
            "provider": self.name,
        }


# Backwards-compatible alias used by older imports/tests
LocalHttpAIProvider = OllamaAIProvider


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


def resolve_ollama_base_url(settings: Settings) -> str:
    """Prefer OLLAMA_BASE_URL; fall back to LOCAL_AI_BASE_URL for compatibility."""
    return (
        (settings.ollama_base_url or "").strip()
        or (settings.local_ai_base_url or "").strip()
        or "http://127.0.0.1:11434"
    ).rstrip("/")


def resolve_ollama_model(settings: Settings) -> str:
    """Prefer OLLAMA_MODEL; fall back to LOCAL_AI_MODEL."""
    return (
        (settings.ollama_model or "").strip()
        or (settings.local_ai_model or "").strip()
        or "qwen2.5:3b"
    )


def build_ai_provider(settings: Settings) -> LocalAIProvider:
    token = (settings.ai_service_token or "").strip()
    if settings.ai_provider in ("raqeeb", "imtithal"):
        return ImtithalAIProvider(
            settings.ai_service_url,
            timeout=settings.ai_request_timeout_seconds,
            service_token=token,
        )
    if settings.ai_provider == "local_http":
        return OllamaAIProvider(
            resolve_ollama_base_url(settings),
            resolve_ollama_model(settings),
            timeout=settings.ai_request_timeout_seconds,
        )
    return StubLocalAIProvider()


async def run_ollama_startup_diagnostics(settings: Settings) -> None:
    """Log provider/model/host reachability without secrets or prompts."""
    if settings.ai_provider != "local_http":
        logger.info(
            "ai_startup provider=%s (skip Ollama probe)",
            settings.ai_provider,
        )
        return
    host = resolve_ollama_base_url(settings)
    model = resolve_ollama_model(settings)
    logger.info(
        "ai_startup provider=local_http model=%s ollama_host=%s",
        model,
        host,
    )
    provider = OllamaAIProvider(host, model, timeout=min(30.0, settings.ai_request_timeout_seconds))
    try:
        names = await provider.list_models()
        present = model in names or any(n == model for n in names)
        logger.info(
            "ai_startup ollama_reachable=true model_present=%s",
            present,
        )
        if not present:
            logger.warning("ai_startup %s", model_missing_message(model))
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "ai_startup ollama_reachable=false error=%s",
            exc.__class__.__name__,
        )
