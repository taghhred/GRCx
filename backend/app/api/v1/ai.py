from fastapi import APIRouter, Depends, HTTPException, Request

import httpx

from app.ai.provider import (
    SAFE_AI_UNAVAILABLE,
    ImtithalAIProvider,
    LocalAIProvider,
    OllamaAIProvider,
    build_ai_provider,
    model_missing_message,
    resolve_ollama_base_url,
    resolve_ollama_model,
)
from app.core.config import Settings, get_settings
from app.core.deps import require_permissions
from app.core.rate_limit import enforce_named_rate_limit
from app.models.user import User
from app.schemas.domain import (
    AdvisorChatRequest,
    AdvisorChatResponse,
    AiChatRequest,
    AiChatResponse,
)

router = APIRouter(prefix="/ai", tags=["ai"])


def get_provider(settings: Settings = Depends(get_settings)) -> LocalAIProvider:
    return build_ai_provider(settings)


def _first_name(user: User) -> str:
    full = (user.full_name or "").strip()
    if not full:
        return "User"
    return full.split()[0]


def _primary_role(user: User) -> str | None:
    roles = getattr(user, "roles", None) or []
    if not roles:
        return None
    return getattr(roles[0], "name", None) or str(roles[0])


def _map_provider_error(exc: Exception) -> HTTPException:
    if isinstance(exc, LookupError):
        return HTTPException(status_code=503, detail=str(exc))
    if isinstance(exc, httpx.TimeoutException):
        return HTTPException(status_code=504, detail=SAFE_AI_UNAVAILABLE)
    if isinstance(exc, (httpx.ConnectError, ConnectionError)):
        return HTTPException(status_code=503, detail=SAFE_AI_UNAVAILABLE)
    if isinstance(exc, httpx.HTTPStatusError):
        status = 503 if exc.response.status_code >= 500 else 502
        return HTTPException(status_code=status, detail=SAFE_AI_UNAVAILABLE)
    return HTTPException(status_code=503, detail=SAFE_AI_UNAVAILABLE)


@router.get("/status")
async def ai_status(
    _: User = Depends(require_permissions("ai:use")),
    settings: Settings = Depends(get_settings),
) -> dict:
    """Backend-visible AI upstream status (no secrets / no paths)."""
    if settings.ai_provider == "stub":
        return {
            "provider": "stub",
            "upstream": None,
            "ready": True,
            "prototype": True,
        }

    if settings.ai_provider == "local_http":
        host = resolve_ollama_base_url(settings)
        model = resolve_ollama_model(settings)
        provider = OllamaAIProvider(host, model, timeout=8.0)
        probe = await provider.probe()
        ready = bool(probe.get("reachable") and probe.get("model_present"))
        payload = {
            "provider": "local_http",
            "upstream": "ollama",
            "ready": ready,
            "prototype": False,
            "model": model,
            "ollama_reachable": probe.get("reachable"),
            "model_present": probe.get("model_present"),
        }
        if probe.get("reachable") and not probe.get("model_present"):
            payload["error"] = model_missing_message(model)
        elif not probe.get("reachable"):
            payload["error"] = "unreachable"
        return payload

    if settings.ai_provider in ("raqeeb", "imtithal"):
        try:
            from app.ai.provider import get_shared_http_client

            client = get_shared_http_client(settings.ai_service_url, 5.0)
            response = await client.get(f"{settings.ai_service_url.rstrip('/')}/ready")
            payload = response.json() if response.content else {}
            safe_upstream = {
                k: payload.get(k)
                for k in (
                    "status",
                    "service",
                    "engine",
                    "model_loaded",
                    "bilingual_mode",
                    "arabert_weights_present",
                    "classifier_backend",
                    "translation_ready",
                    "version",
                    "articles_count",
                    "classifier",
                    "checkpoint",
                )
                if k in payload
            }
            provider_name = "imtithal" if settings.ai_provider == "imtithal" else "raqeeb"
            return {
                "provider": provider_name,
                "upstream": "ai-service",
                "ready": response.status_code == 200,
                "prototype": False,
                "upstream_status": safe_upstream,
            }
        except Exception:  # noqa: BLE001
            provider_name = "imtithal" if settings.ai_provider == "imtithal" else "raqeeb"
            return {
                "provider": provider_name,
                "upstream": "ai-service",
                "ready": False,
                "prototype": False,
                "error": "unreachable",
            }

    return {
        "provider": settings.ai_provider,
        "upstream": None,
        "ready": False,
        "prototype": False,
    }


@router.post("/chat", response_model=AiChatResponse)
async def chat(
    body: AiChatRequest,
    request: Request,
    current_user: User = Depends(require_permissions("ai:use")),
    settings: Settings = Depends(get_settings),
    provider: LocalAIProvider = Depends(get_provider),
) -> AiChatResponse:
    enforce_named_rate_limit(request, "ai", max_attempts=40)
    if not body.messages:
        raise HTTPException(status_code=400, detail="messages required")
    if not any((m.content or "").strip() for m in body.messages if m.role == "user"):
        raise HTTPException(status_code=400, detail="Empty prompt")

    messages = [{"role": m.role, "content": m.content} for m in body.messages]
    user_context = {
        "user_id": str(current_user.id),
        "first_name": _first_name(current_user),
        "role": _primary_role(current_user),
        "department": current_user.department,
    }

    try:
        reply = await provider.generate(
            messages,
            body.page_context,
            user_context,
        )
    except Exception as exc:  # noqa: BLE001
        raise _map_provider_error(exc) from exc

    return AiChatResponse(
        reply=reply,
        provider=getattr(provider, "name", settings.ai_provider),
        prototype=settings.ai_provider == "stub",
    )


@router.post("/advisor/chat", response_model=AdvisorChatResponse)
async def advisor_chat(
    body: AdvisorChatRequest,
    request: Request,
    current_user: User = Depends(require_permissions("ai:use")),
    settings: Settings = Depends(get_settings),
    provider: LocalAIProvider = Depends(get_provider),
) -> AdvisorChatResponse:
    """GRC advisor — Ollama (local_http) or Imtithal AI service."""
    enforce_named_rate_limit(request, "ai", max_attempts=40)
    message = (body.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="message required")

    module = body.module or (body.page_context or {}).get("moduleLabel")
    history = [
        {"role": m.role, "content": m.content}
        for m in body.history
        if (m.content or "").strip()
    ][-12:]

    if settings.ai_provider == "stub":
        return AdvisorChatResponse(
            reply=(
                f"[Prototype stub] Received: {message[:200]}. "
                "Set AI_PROVIDER=local_http and configure Ollama for live answers."
            ),
            sources=[],
            grounded=False,
            refused=False,
            model="stub",
            provider="stub",
            prototype=True,
        )

    if not isinstance(provider, (ImtithalAIProvider, OllamaAIProvider)):
        raise HTTPException(status_code=503, detail=SAFE_AI_UNAVAILABLE)

    try:
        data = await provider.advisor_chat(
            message=message,
            history=history,
            module=str(module) if module else None,
            lang=body.lang or "auto",
            page_context=body.page_context or {},
        )
    except Exception as exc:  # noqa: BLE001
        raise _map_provider_error(exc) from exc

    reply = data.get("reply")
    if not isinstance(reply, str) or not reply.strip():
        raise HTTPException(status_code=503, detail=SAFE_AI_UNAVAILABLE)

    provider_name = getattr(provider, "name", settings.ai_provider)
    return AdvisorChatResponse(
        reply=reply.strip(),
        sources=data.get("sources") or [],
        grounded=bool(data.get("grounded")),
        refused=bool(data.get("refused")),
        model=data.get("model") or (
            resolve_ollama_model(settings) if provider_name == "local_http" else None
        ),
        provider=provider_name,
        prototype=False,
    )
