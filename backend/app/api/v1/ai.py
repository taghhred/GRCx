from fastapi import APIRouter, Depends, HTTPException, Request

import httpx

from app.ai.provider import SAFE_AI_UNAVAILABLE, ImtithalAIProvider, LocalAIProvider, build_ai_provider
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
    if settings.ai_provider in ("raqeeb", "imtithal"):
        try:
            from app.ai.provider import get_shared_http_client

            client = get_shared_http_client(settings.ai_service_url, 5.0)
            response = await client.get(f"{settings.ai_service_url.rstrip('/')}/ready")
            payload = response.json() if response.content else {}
            # Never leak local paths from upstream error payloads
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
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=504, detail=SAFE_AI_UNAVAILABLE) from exc
    except httpx.ConnectError as exc:
        raise HTTPException(status_code=503, detail=SAFE_AI_UNAVAILABLE) from exc
    except httpx.HTTPStatusError as exc:
        status = 503 if exc.response.status_code >= 500 else 502
        raise HTTPException(status_code=status, detail=SAFE_AI_UNAVAILABLE) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=SAFE_AI_UNAVAILABLE) from exc

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
    """Grounded GRC advisor — proxied to Imtithal /advisor/chat."""
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
                "Set AI_PROVIDER=imtithal and start the AI service for grounded answers."
            ),
            sources=[],
            grounded=False,
            refused=False,
            model="stub",
            provider="stub",
            prototype=True,
        )

    if not isinstance(provider, ImtithalAIProvider):
        raise HTTPException(status_code=503, detail=SAFE_AI_UNAVAILABLE)

    try:
        data = await provider.advisor_chat(
            message=message,
            history=history,
            module=str(module) if module else None,
            lang=body.lang or "auto",
            page_context=body.page_context or {},
        )
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=504, detail=SAFE_AI_UNAVAILABLE) from exc
    except httpx.ConnectError as exc:
        raise HTTPException(status_code=503, detail=SAFE_AI_UNAVAILABLE) from exc
    except httpx.HTTPStatusError as exc:
        status = 503 if exc.response.status_code >= 500 else 502
        raise HTTPException(status_code=status, detail=SAFE_AI_UNAVAILABLE) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=SAFE_AI_UNAVAILABLE) from exc

    reply = data.get("reply")
    if not isinstance(reply, str) or not reply.strip():
        raise HTTPException(status_code=503, detail=SAFE_AI_UNAVAILABLE)

    return AdvisorChatResponse(
        reply=reply.strip(),
        sources=data.get("sources") or [],
        grounded=bool(data.get("grounded")),
        refused=bool(data.get("refused")),
        model=data.get("model"),
        provider="imtithal",
        prototype=False,
    )
