from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.logging_config import configure_logging
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.services.bootstrap import seed_rbac_and_demo_user
from app.services.risk_register import ensure_risks_seeded
from app.services.operational_seed import ensure_operational_seeded
import app.models  # noqa: F401 — register metadata

logger = logging.getLogger("grcx.main")

_WEAK_SECRETS = frozenset(
    {
        "dev-only-change-me",
        "dev-only-change-me-use-openssl-rand-hex-32",
        "change-me",
        "secret",
    }
)

_CSRF_EXEMPT_PATHS = frozenset(
    {
        "/api/v1/auth/login",
        "/api/v1/auth/token",
        "/api/v1/health",
        "/api/v1/ready",
    }
)
_MUTATING_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault(
            "Permissions-Policy", "camera=(), microphone=(), geolocation=()"
        )
        response.headers.setdefault("Cache-Control", "no-store")
        return response


class CookieCsrfMiddleware(BaseHTTPMiddleware):
    """Require X-GRCx-CSRF: 1 or an Origin in the CORS allow-list for cookie auth mutations."""

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.method in _MUTATING_METHODS:
            path = request.url.path
            if path not in _CSRF_EXEMPT_PATHS:
                csrf = request.headers.get("X-GRCx-CSRF", "")
                origin = request.headers.get("Origin", "")
                settings = get_settings()
                if csrf != "1" and origin not in settings.cors_origin_list:
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "CSRF validation failed"},
                    )
        return await call_next(request)


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    configure_logging("DEBUG" if settings.grcx_env == "development" else "INFO")
    logger.info("Starting GRCx API env=%s ai_provider=%s", settings.grcx_env, settings.ai_provider)
    # Phase 1: create tables (Alembic migrations in Phase 2+)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_rbac_and_demo_user(db)
        ensure_risks_seeded(db)
        ensure_operational_seeded(db)
    finally:
        db.close()
    yield
    logger.info("Shutting down GRCx API")


def create_app() -> FastAPI:
    settings = get_settings()
    if settings.grcx_env == "production" and settings.secret_key in _WEAK_SECRETS:
        raise RuntimeError(
            "Refusing to start: SECRET_KEY is a known weak default. "
            "Set a strong SECRET_KEY before running with GRCX_ENV=production."
        )

    docs = None if settings.grcx_env == "production" else "/docs"
    redoc = None if settings.grcx_env == "production" else "/redoc"
    openapi = None if settings.grcx_env == "production" else "/openapi.json"

    app = FastAPI(
        title="GRCx API",
        description=(
            "Local-first Governance, Risk & Compliance API. "
            "AI uses LocalAIProvider only — no external cloud AI."
        ),
        version="0.1.0",
        lifespan=lifespan,
        docs_url=docs,
        redoc_url=redoc,
        openapi_url=openapi,
    )
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(CookieCsrfMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
    app.include_router(api_router)
    return app


app = create_app()
