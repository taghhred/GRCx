from fastapi import APIRouter

from app.api.v1 import (
    ai,
    audit,
    auth,
    cases,
    dashboard,
    governance,
    health,
    modules,
    notifications,
    reports,
    risks,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(cases.router)
api_router.include_router(governance.router)
api_router.include_router(risks.router)
api_router.include_router(ai.router)
api_router.include_router(notifications.router)
api_router.include_router(audit.router)
api_router.include_router(dashboard.router)
api_router.include_router(modules.router)
api_router.include_router(reports.router)
