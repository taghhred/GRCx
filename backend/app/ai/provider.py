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

# Railway-friendly defaults: prefer 1.5b when already installed, else 0.5b.
DEFAULT_OLLAMA_MODEL = "qwen2.5:0.5b"
PREFERRED_LIGHT_MODELS = ("qwen2.5:1.5b", "qwen2.5:0.5b")
# Known-too-large for typical Railway Ollama memory; auto-switch to a light model.
HEAVY_OLLAMA_MODELS = frozenset(
    {
        "qwen2.5:3b",
        "qwen2.5:7b",
        "qwen2.5:14b",
        "qwen2.5:32b",
        "qwen2.5:72b",
    }
)

_shared_clients: dict[str, httpx.AsyncClient] = {}
_ollama_singleton: Any = None

# Compact Railway-friendly decode budget (CPU / low RAM).
OLLAMA_OPTIONS = {
    "temperature": 0.1,
    "num_ctx": 1024,
    "num_predict": 96,
}
OLLAMA_KEEP_ALIVE = "30m"


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
        self.model = (model or "").strip() or DEFAULT_OLLAMA_MODEL
        self.timeout = timeout
        self._pull_attempted = False
        self._model_ready = False
        self._inference_ok: bool | None = None
        self._validate_trusted_host()

    def _validate_trusted_host(self) -> None:
        """SSRF guard — only configured private/local Ollama hosts."""
        from urllib.parse import urlparse

        parsed = urlparse(self.base_url)
        host = (parsed.hostname or "").lower()
        scheme = (parsed.scheme or "").lower()
        if scheme not in {"http", "https"}:
            raise ValueError("ollama_untrusted_scheme")
        allowed_suffixes = (".railway.internal", ".local")
        allowed_exact = {
            "localhost",
            "127.0.0.1",
            "ollama",
            "host.docker.internal",
        }
        ok = host in allowed_exact or any(host.endswith(s) for s in allowed_suffixes)
        if not ok:
            raise ValueError("ollama_untrusted_host")

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

    def _pick_installed_light_model(self, names: list[str]) -> str | None:
        """Prefer qwen2.5:1.5b if present, else qwen2.5:0.5b."""
        for candidate in PREFERRED_LIGHT_MODELS:
            if candidate in names:
                return candidate
        return None

    async def pull_model(self, name: str) -> None:
        """Pull a model via Ollama /api/pull (stream=false)."""
        logger.info("ollama_pull_start model=%s host=%s", name, self.base_url)
        # Pulls can take several minutes on first download.
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(900.0, connect=30.0),
            http2=False,
            trust_env=False,
        ) as client:
            response = await client.post(
                f"{self.base_url}/api/pull",
                json={"name": name, "stream": False},
            )
            if response.status_code >= 400:
                preview = (response.text or "")[:180].replace("\n", " ")
                logger.warning(
                    "ollama_pull_http status=%s body=%s",
                    response.status_code,
                    preview,
                )
            response.raise_for_status()
        names = await self.list_models()
        if name not in names:
            raise LookupError(model_missing_message(name))
        logger.info("ollama_pull_done model=%s", name)

    async def model_available(self) -> bool:
        names = await self.list_models()
        return self.model in names

    async def ensure_model(self) -> None:
        """Ensure a runnable light model is selected; pull default if missing."""
        try:
            names = await self.list_models()
        except Exception as exc:  # noqa: BLE001
            raise ConnectionError(f"ollama_unreachable:{exc.__class__.__name__}") from exc

        # Heavy models (e.g. qwen2.5:3b) OOM on small Railway nodes even when tagged.
        wants_light = self.model in HEAVY_OLLAMA_MODELS or self.model not in names
        if not wants_light and self.model in names:
            self._model_ready = True
            return

        installed = self._pick_installed_light_model(names)
        if installed:
            if installed != self.model:
                logger.info(
                    "ollama_model_switch requested=%s using_installed=%s",
                    self.model,
                    installed,
                )
                self.model = installed
            self._model_ready = True
            return

        pull_target = DEFAULT_OLLAMA_MODEL
        if self.model in PREFERRED_LIGHT_MODELS:
            pull_target = self.model
        if self._pull_attempted:
            raise LookupError(model_missing_message(pull_target))
        self._pull_attempted = True
        try:
            await self.pull_model(pull_target)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "ollama_pull_failed model=%s error=%s",
                pull_target,
                exc.__class__.__name__,
            )
            raise LookupError(model_missing_message(pull_target)) from exc
        self.model = pull_target
        self._model_ready = True

    async def ensure_model_once(self) -> None:
        """Startup / recovery path — skip when already ready."""
        if self._model_ready:
            return
        await self.ensure_model()
        self._model_ready = True

    async def _chat(self, messages: list[dict[str, str]], *, ensure: bool = False) -> str:
        if ensure or not self._model_ready:
            await self.ensure_model_once()
        client = self._client()
        options = dict(OLLAMA_OPTIONS)
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "keep_alive": OLLAMA_KEEP_ALIVE,
            "options": options,
        }
        try:
            response = await client.post(f"{self.base_url}/api/chat", json=payload)
            if response.status_code == 404:
                # Model disappeared — one recovery ensure + retry.
                self._model_ready = False
                await self.ensure_model_once()
                payload["model"] = self.model
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
        except httpx.TimeoutException:
            # Do not double-wait on /api/generate after a timeout.
            raise
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
            "keep_alive": OLLAMA_KEEP_ALIVE,
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

    async def warm(self) -> bool:
        """Load model into memory once (startup). Returns True if generate works."""
        try:
            await self.ensure_model_once()
            response = await self._client().post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": "ok",
                    "stream": False,
                    "keep_alive": OLLAMA_KEEP_ALIVE,
                    "options": {"temperature": 0.0, "num_predict": 2, "num_ctx": 256},
                },
            )
            ok = response.status_code == 200 and bool(
                ((response.json() or {}).get("response") or "").strip()
            )
            self._inference_ok = ok
            logger.info(
                "ollama_warm model=%s ok=%s status=%s",
                self.model,
                ok,
                response.status_code,
            )
            return ok
        except Exception as exc:  # noqa: BLE001
            self._inference_ok = False
            logger.warning("ollama_warm_failed error=%s", exc.__class__.__name__)
            return False

    def mark_inference(self, ok: bool) -> None:
        self._inference_ok = ok

    @property
    def inference_ok(self) -> bool | None:
        return self._inference_ok

    async def chat_messages(
        self,
        messages: list[dict[str, str]],
        *,
        ensure: bool = False,
    ) -> str:
        """Public chat entry used by the grounded advisor (no per-request pull)."""
        return await self._chat(messages, ensure=ensure)

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
        return await self._chat(chat_messages, ensure=False)

    async def advisor_chat(
        self,
        message: str,
        history: list[dict[str, str]] | None = None,
        module: str | None = None,
        lang: str = "auto",
        page_context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        from app.ai.grounded import run_grounded_advisor

        mod = module or (page_context or {}).get("moduleLabel")
        result = await run_grounded_advisor(
            message=message,
            ollama=self,
            module=str(mod) if mod else None,
            history=history,
        )
        # lang reserved for future prompt hints; grounding path mirrors user language.
        _ = lang
        return result


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
    """Prefer OLLAMA_MODEL; fall back to LOCAL_AI_MODEL; default qwen2.5:0.5b."""
    return (
        (settings.ollama_model or "").strip()
        or (settings.local_ai_model or "").strip()
        or DEFAULT_OLLAMA_MODEL
    )


def build_ai_provider(settings: Settings) -> LocalAIProvider:
    global _ollama_singleton
    token = (settings.ai_service_token or "").strip()
    if settings.ai_provider in ("raqeeb", "imtithal"):
        return ImtithalAIProvider(
            settings.ai_service_url,
            timeout=settings.ai_request_timeout_seconds,
            service_token=token,
        )
    if settings.ai_provider == "local_http":
        host = resolve_ollama_base_url(settings)
        model = resolve_ollama_model(settings)
        # Reuse one provider instance so keep_alive / _model_ready persist.
        if (
            isinstance(_ollama_singleton, OllamaAIProvider)
            and _ollama_singleton.base_url == host
            and not _ollama_singleton._client().is_closed
        ):
            # Allow env model change to refresh target; heavy-model switch still in ensure.
            if _ollama_singleton.model != model and model not in HEAVY_OLLAMA_MODELS:
                _ollama_singleton.model = model
                _ollama_singleton._model_ready = False
            return _ollama_singleton
        _ollama_singleton = OllamaAIProvider(
            host,
            model,
            timeout=min(45.0, settings.ai_request_timeout_seconds),
        )
        return _ollama_singleton
    return StubLocalAIProvider()


async def run_ollama_startup_diagnostics(settings: Settings) -> None:
    """Log provider/model/host reachability; warm light model if reachable."""
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
    provider = build_ai_provider(settings)
    if not isinstance(provider, OllamaAIProvider):
        return
    try:
        await provider.ensure_model_once()
        from app.ai.retriever import load_chunks

        n = len(load_chunks())
        warmed = await provider.warm()
        logger.info(
            "ai_startup ollama_reachable=true model_present=true active_model=%s "
            "kb_chunks=%s warmed=%s",
            provider.model,
            n,
            warmed,
        )
    except LookupError:
        logger.warning("ai_startup %s", model_missing_message(provider.model))
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "ai_startup ollama_reachable=false error=%s",
            exc.__class__.__name__,
        )
