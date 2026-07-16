from fastapi import APIRouter

from app.ai.provider import OllamaAIProvider, resolve_ollama_base_url, resolve_ollama_model
from app.core.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "grcx-api"}


@router.get("/ready")
async def ready() -> dict:
    """Process ready. When AI_PROVIDER=local_http, also reports Ollama reachability."""
    settings = get_settings()
    payload: dict = {"status": "ready", "ai_provider": settings.ai_provider}
    if settings.ai_provider == "local_http":
        host = resolve_ollama_base_url(settings)
        model = resolve_ollama_model(settings)
        probe = await OllamaAIProvider(host, model, timeout=5.0).probe(deep=False)
        payload["ollama"] = {
            "host": host,
            "model": model,
            "reachable": probe.get("reachable"),
            "model_present": probe.get("model_present"),
        }
    return payload
