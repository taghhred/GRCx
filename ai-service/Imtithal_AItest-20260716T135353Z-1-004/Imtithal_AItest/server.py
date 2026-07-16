#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Imtithal production local API — singleton AraBERT pipeline.

Endpoints:
- GET  /health
- GET  /ready
- GET  /dashboard
- GET  /stats
- GET  /findings
- POST /analyze  (optional save → findings DB)
- POST /soar/generate  (mock SOAR prototype)
- GET  /excel/template
- POST /excel/import
- POST /api/v1/chat  (GRCx backend proxy contract)
"""
from __future__ import annotations

import io
import logging
import os
import sys
import time
import uuid
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import uvicorn
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response as PlainResponse
from pydantic import BaseModel, Field
from starlette.middleware.base import BaseHTTPMiddleware

from imtithal.advisor import get_advisor, warm_advisor_resources
from imtithal import datasources, storage
from imtithal.assistant import ConversationalAssistant
from imtithal.logging_setup import setup_logging
from imtithal.pipeline import ImtithalPipeline

ROOT = Path(__file__).resolve().parent
HTML = ROOT / "web" / "imtithal_analyzer.html"
DASHBOARD_HTML = ROOT / "web" / "imtithal_dashboard.html"
LOG_FILE = setup_logging(ROOT, level=os.environ.get("AI_LOG_LEVEL", "INFO"))
logger = logging.getLogger("imtithal.api")

app = FastAPI(title="Imtithal Local API", version="2.1.0")

_cors = os.environ.get(
    "AI_CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
)
_cors_origins = [o.strip() for o in _cors.split(",") if o.strip()]
if not _cors_origins:
    _cors_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        rid = request.headers.get("x-request-id") or str(uuid.uuid4())
        t0 = time.perf_counter()
        response = await call_next(request)
        ms = (time.perf_counter() - t0) * 1000
        response.headers["X-Request-Id"] = rid
        logger.info(
            "request_id=%s method=%s path=%s status=%s ms=%.0f",
            rid,
            request.method,
            request.url.path,
            response.status_code,
            ms,
        )
        return response


app.add_middleware(RequestIdMiddleware)

_AI_TOKEN_PROTECTED = frozenset({"/analyze", "/api/v1/chat", "/advisor/chat"})
_LOCALHOST = frozenset({"127.0.0.1", "::1", "localhost", "testclient"})


class AiServiceTokenMiddleware(BaseHTTPMiddleware):
    """Require X-GRCx-AI-Token for protected routes when AI_SERVICE_TOKEN is set.

    If the env var is unset, only localhost clients are allowed (dev convenience).
    Health/ready remain open.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.method == "OPTIONS":
            return await call_next(request)
        path = request.url.path.rstrip("/") or "/"
        if path not in _AI_TOKEN_PROTECTED:
            return await call_next(request)

        expected = (os.environ.get("AI_SERVICE_TOKEN") or "").strip()
        got = request.headers.get("X-GRCx-AI-Token") or ""
        if expected:
            if got != expected:
                return JSONResponse(
                    status_code=401, content={"detail": "Invalid or missing AI service token"}
                )
        else:
            client = request.client.host if request.client else ""
            if client not in _LOCALHOST:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "AI service token required for non-localhost clients"},
                )
        return await call_next(request)


app.add_middleware(AiServiceTokenMiddleware)

# Ensure optional LLM layers are not silently disabled by stale shell env
for _k in ("IMTITHAL_NO_LLM", "RAQEEB_NO_LLM"):
    if os.environ.get(_k, "").strip().lower() in {"1", "true", "yes"}:
        logger.warning("Clearing %s so chat LLM / Ollama layers can activate", _k)
        os.environ.pop(_k, None)

logger.info("Initializing findings DB…")
storage.init_db()

logger.info("Initializing Imtithal pipeline (singleton)…")
PIPE = ImtithalPipeline()  # loads AraBERT once for process lifetime
ASSISTANT = ConversationalAssistant(PIPE)
ADVISOR = get_advisor(PIPE)
try:
    _warm = warm_advisor_resources(PIPE)
    logger.info("Advisor warm complete %s", _warm)
    print(f"Advisor warm: {_warm}")
except Exception as _warm_exc:  # noqa: BLE001
    logger.warning("Advisor warm failed: %s", _warm_exc)
INFO = PIPE.engine_info()
CHAT_INFO = ASSISTANT.chat_model.info()
MODEL_LOADED = bool(PIPE.classifier.model_loaded)
NO_MODEL_MESSAGE = "No trained model installed."
print("=" * 72)
print("INFERENCE PIPELINE")
print("  User Question → Chat LLM / Dialogue Engine → Natural Response")
print("  Optional: AraBERT → Violation Category / Confidence / Policy Mapping")
print(f"  Active answer engine : {CHAT_INFO.get('model_name') if CHAT_INFO.get('available') else 'grcx-dialogue-engine'}")
print(f"  Chat checkpoint path : {CHAT_INFO.get('checkpoint_path') or 'imtithal/dialogue.py (no CausalLM weights found)'}")
print(f"  Chat tokenizer       : {CHAT_INFO.get('tokenizer') or 'n/a'}")
print(f"  Chat load error      : {CHAT_INFO.get('error')}")
print(f"  Classifier model     : arabert / {INFO.get('classifier')}")
print(f"  Classifier checkpoint: {INFO.get('checkpoint')}")
print(f"  Classifier path      : {INFO.get('model_path')}")
print(f"  Optional Ollama/API  : {INFO.get('llm')}")
print(f"  Findings DB          : {storage.DB_PATH}")
print(f"  Dashboard            : http://127.0.0.1:{os.environ.get('AI_PORT', '8001')}/dashboard")
print("=" * 72)
if MODEL_LOADED:
    logger.info(
        "Pipeline ready classifier=%s checkpoint=%s path=%s chat=%s",
        INFO.get("classifier"),
        INFO.get("checkpoint"),
        INFO.get("model_path"),
        CHAT_INFO,
    )
else:
    logger.warning("%s", NO_MODEL_MESSAGE)


class AnalyzeRequest(BaseModel):
    text: str = Field(min_length=1, max_length=16000)
    top_articles: int = 4
    use_llm: bool = True
    lang: str = "auto"
    save: bool = True
    department: str | None = None


class StatusUpdate(BaseModel):
    status: str = Field(min_length=1, max_length=32)


class SoarGenerateRequest(BaseModel):
    count: int = Field(default=8, ge=1, le=100)
    use_llm: bool = False
    categories: list[str] | None = None


class AdvisorHistoryTurn(BaseModel):
    role: str = Field(min_length=1, max_length=16)
    content: str = Field(default="", max_length=4000)


class AdvisorChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: list[AdvisorHistoryTurn] = Field(default_factory=list, max_length=24)
    module: str | None = Field(default=None, max_length=128)
    lang: str = "auto"
    page_context: dict | None = None


class ChatMessage(BaseModel):
    role: str = Field(min_length=1, max_length=32)
    content: str = Field(default="", max_length=16000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(default_factory=list, max_length=40)
    page_context: dict | None = None
    user_id: str | None = None
    user_first_name: str | None = None
    user_role: str | None = None
    user_department: str | None = None
    top_articles: int = 4
    use_llm: bool = True
    lang: str = "auto"


def _last_user_text(messages: list[ChatMessage]) -> str:
    for msg in reversed(messages):
        if msg.role == "user" and (msg.content or "").strip():
            return msg.content.strip()
    return ""


def _detect_lang(text: str) -> str:
    from imtithal.reporter import detect_lang

    return detect_lang(text)


def _format_chat_reply(report: dict) -> str:
    from imtithal.reporter import format_report_text

    return format_report_text(report)


def _require_model() -> None:
    if not MODEL_LOADED:
        raise HTTPException(status_code=503, detail=NO_MODEL_MESSAGE)


@app.get("/")
def home():
    if HTML.exists():
        return FileResponse(HTML)
    return JSONResponse({"message": "Imtithal API", "api": "/analyze", "health": "/health"})


@app.get("/health")
def health():
    chat = ASSISTANT.chat_model.info()
    return {
        "status": "ok" if MODEL_LOADED else "degraded",
        "service": "imtithal-local-api",
        "engine": "imtithal",
        "model_loaded": MODEL_LOADED,
        "message": None if MODEL_LOADED else NO_MODEL_MESSAGE,
        "version": "2.1.0",
        "inference_pipeline": (
            "User → ChatLLM/Dialogue → Natural Response; "
            "optional AraBERT → category/confidence/policy"
        ),
        "chat_engine": {
            "active": (
                chat.get("model_name")
                if chat.get("available")
                else "grcx-dialogue-engine"
            ),
            "causal_llm_available": bool(chat.get("available")),
            "checkpoint_path": chat.get("checkpoint_path"),
            "tokenizer": chat.get("tokenizer"),
            "architecture": chat.get("architecture"),
            "error": chat.get("error"),
        },
        "classifier_role": "classification_policy_confidence_only",
        **PIPE.engine_info(),
    }


@app.get("/ready")
def ready():
    clf = ROOT / "models" / "classifier"
    weights = (clf / "model.safetensors").exists() or (clf / "pytorch_model.bin").exists()
    if not MODEL_LOADED or not weights:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "not_ready",
                "message": NO_MODEL_MESSAGE,
                "model_loaded": False,
                "arabert_weights_present": weights,
            },
        )
    info = PIPE.engine_info()
    return {
        "status": "ready",
        "service": "imtithal-local-api",
        "engine": "imtithal",
        "model_loaded": True,
        "bilingual_mode": True,
        "arabert_weights_present": True,
        "classifier_backend": info.get("classifier"),
        "retriever_backend": info.get("retriever"),
        "articles_count": info.get("articles_count"),
        "model_path": info.get("model_path"),
        "checkpoint": info.get("checkpoint"),
        "version": "2.1.0",
        "classifier": info.get("classifier_label"),
        "retriever": info.get("retriever_label"),
    }


@app.post("/advisor/chat")
def advisor_chat(req: AdvisorChatRequest):
    """Routed GRC advisor — timings + route metadata for production ops."""
    _require_model()
    message = (req.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Empty message")
    history = [{"role": t.role, "content": t.content} for t in req.history]
    t0 = time.perf_counter()
    try:
        result = ADVISOR.answer(
            message=message,
            history=history,
            module=req.module,
            lang=req.lang if req.lang in ("ar", "en", "auto") else "auto",
            page_context=req.page_context or {},
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("advisor chat failed")
        return {
            "reply": "The advisor could not process this question. Please try again.",
            "sources": [],
            "grounded": False,
            "refused": False,
            "model": None,
            "route": None,
            "error": "internal_error",
        }
    wall_ms = (time.perf_counter() - t0) * 1000
    timings = dict(result.get("timings") or {})
    timings["wall_ms"] = round(wall_ms, 1)
    result["timings"] = timings
    logger.info(
        "advisor ok route=%s model=%s sources=%s wall_ms=%.0f",
        result.get("route"),
        result.get("model"),
        len(result.get("sources") or []),
        wall_ms,
    )
    return result


@app.post("/api/v1/chat")
def chat_v1(req: ChatRequest):
    """Conversational GRCx assistant.

    AraBERT grounds classification. Full Violation Analysis Report is only used
    for analyze-intent messages (or POST /analyze).
    """
    _require_model()
    user_text = _last_user_text(req.messages)
    if not user_text:
        raise HTTPException(status_code=400, detail="Empty prompt")
    user_lang = req.lang if req.lang in ("ar", "en") else _detect_lang(user_text)
    messages = [{"role": m.role, "content": m.content} for m in req.messages]
    t0 = time.perf_counter()
    try:
        result = ASSISTANT.reply(
            messages=messages,
            page_context=req.page_context or {},
            user_first_name=req.user_first_name,
            user_role=req.user_role,
            user_department=req.user_department,
            lang=user_lang,
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("chat failed")
        raise HTTPException(status_code=503, detail="AI processing unavailable") from exc
    reply = (result.get("reply") or "").strip()
    if not reply:
        raise HTTPException(status_code=503, detail="empty reply")
    meta = result.get("meta") or {}
    logger.info(
        "chat ok mode=%s intent=%s answer_model=%s classifier=%s ms=%.0f",
        result.get("mode"),
        meta.get("intent"),
        meta.get("answer_model"),
        meta.get("classifier_category"),
        (time.perf_counter() - t0) * 1000,
    )
    print(
        f"[chat] answer_model={meta.get('answer_model')} "
        f"answer_checkpoint={meta.get('answer_checkpoint')} "
        f"classifier=arabert:{meta.get('classifier_category')} "
        f"conf={meta.get('confidence')} "
        f"arabert_replaced_answer={meta.get('arabert_replaced_answer')}"
    )
    return {
        "reply": reply,
        "provider": "imtithal",
        "prototype": False,
        "mode": result.get("mode"),
        "language": {
            "input": user_lang,
            "model": result.get("language") or user_lang,
            "output": result.get("language") or user_lang,
            "bilingual_native": True,
        },
        "classification": result.get("classification"),
        "meta": {
            "answer_model": meta.get("answer_model"),
            "answer_checkpoint": meta.get("answer_checkpoint"),
            "answer_tokenizer": meta.get("answer_tokenizer"),
            "classifier_model": "arabert",
            "classifier_category": meta.get("classifier_category"),
            "classifier_checkpoint": meta.get("classifier_checkpoint") or INFO.get("checkpoint"),
            "classifier_path": meta.get("classifier_path") or INFO.get("model_path"),
            "confidence": meta.get("confidence"),
            "severity": meta.get("severity"),
            "policy_mapping": meta.get("policy_mapping"),
            "inference_pipeline": meta.get("inference_pipeline"),
            "arabert_replaced_answer": False,
            "mode": result.get("mode"),
            "intent": meta.get("intent"),
            "response_layer": meta.get("response_layer"),
            "dialogue_topic": meta.get("dialogue_topic"),
        },
    }


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    _require_model()
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty text")
    try:
        report = PIPE.analyze(
            text,
            top_k_articles=max(1, min(req.top_articles, 8)),
            use_llm=req.use_llm,
            lang=req.lang if req.lang in ("ar", "en") else "auto",
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("analyze failed")
        raise HTTPException(status_code=503, detail="AI processing unavailable") from exc

    if req.save:
        try:
            fid = storage.save_finding(
                report,
                source="manual",
                department=req.department,
            )
            report = {**report, "finding_id": fid, "saved": True}
        except Exception as exc:  # noqa: BLE001
            logger.exception("save_finding failed")
            report = {**report, "saved": False, "save_error": str(exc)}
    return report


@app.get("/dashboard")
def dashboard():
    if DASHBOARD_HTML.exists():
        return FileResponse(DASHBOARD_HTML)
    raise HTTPException(status_code=404, detail="Dashboard HTML not found")


@app.get("/stats")
def stats():
    return storage.compute_stats()


@app.get("/findings")
def findings_list(
    limit: int = 50,
    status: str | None = None,
    source: str | None = None,
):
    return {"findings": storage.list_findings(limit=limit, status=status, source=source)}


@app.get("/findings/{finding_id}")
def finding_get(finding_id: str):
    row = storage.get_finding(finding_id)
    if not row:
        raise HTTPException(status_code=404, detail="Finding not found")
    return row


@app.post("/findings/{finding_id}/status")
def finding_status(finding_id: str, body: StatusUpdate):
    status = (body.status or "").strip().lower()
    if status not in {"open", "in_progress", "closed"}:
        raise HTTPException(
            status_code=400,
            detail="status must be one of: open, in_progress, closed",
        )
    ok = storage.update_status(finding_id, status)
    if not ok:
        raise HTTPException(status_code=404, detail="Finding not found")
    return {"id": finding_id, "status": status, "stats": storage.compute_stats()}


@app.delete("/findings")
def findings_clear(source: str | None = None):
    try:
        deleted = storage.clear_all(source=source)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"deleted": deleted, "stats": storage.compute_stats()}


@app.post("/soar/generate")
def soar_generate(req: SoarGenerateRequest):
    """Mock SOAR prototype: generate alerts → analyze → save (source=soar).

    Not a live SOC integration. Future real SOAR ingest can reuse this shape
    or a dedicated ingest endpoint.
    """
    _require_model()
    alerts = datasources.generate_soar_alerts(req.count, categories=req.categories)
    saved: list[dict] = []
    errors: list[str] = []
    for alert in alerts:
        try:
            report = PIPE.analyze(
                alert["text"],
                top_k_articles=3,
                use_llm=req.use_llm,
                lang="auto",
            )
            fid = storage.save_finding(
                report,
                source="soar",
                department=alert.get("department"),
            )
            saved.append(
                {
                    "finding_id": fid,
                    "category": (report.get("classification") or {}).get("category"),
                    "hint": alert.get("soar_category_hint"),
                    "department": alert.get("department"),
                    "severity": report.get("severity"),
                }
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("soar alert analyze failed")
            errors.append(str(exc))
    return {
        "generated": len(saved),
        "requested": len(alerts),
        "errors": errors,
        "items": saved,
        "prototype": True,
        "note": "Mock SOAR generator — not a live SOAR/SOC feed",
        "stats": storage.compute_stats(),
    }


@app.get("/excel/template")
def excel_template():
    try:
        content = datasources.excel_template_bytes()
    except Exception as exc:  # noqa: BLE001
        logger.exception("excel template failed")
        raise HTTPException(status_code=500, detail=f"Template failed: {exc}") from exc
    return PlainResponse(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": 'attachment; filename="imtithal_findings_template.xlsx"'
        },
    )


@app.post("/excel/import")
async def excel_import(request: Request, use_llm: bool = False):
    """Import Excel/CSV findings. Reads raw body (no python-multipart required).

    Frontend: Content-Type application/octet-stream, body = file.arrayBuffer().
    """
    _require_model()
    content = await request.body()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file body")
    try:
        rows = datasources.read_excel_rows(content)
    except Exception as exc:  # noqa: BLE001
        logger.exception("excel parse failed")
        raise HTTPException(status_code=400, detail=f"Cannot parse file: {exc}") from exc
    if not rows:
        raise HTTPException(status_code=400, detail="No data rows found")

    imported = 0
    errors: list[str] = []
    for row in rows:
        try:
            report = PIPE.analyze(
                row["text"],
                top_k_articles=3,
                use_llm=use_llm,
                lang="auto",
            )
            storage.save_finding(
                report,
                source="excel",
                department=row.get("department"),
            )
            imported += 1
        except Exception as exc:  # noqa: BLE001
            logger.exception("excel row analyze failed")
            errors.append(str(exc))
    return {
        "imported": imported,
        "total_rows": len(rows),
        "errors": errors,
        "stats": storage.compute_stats(),
    }


if __name__ == "__main__":
    port = int(os.environ.get("AI_PORT", "8001"))
    host = os.environ.get("AI_HOST", "127.0.0.1")
    logger.info("Listening http://%s:%s log_file=%s", host, port, LOG_FILE)
    print(f"Dashboard: http://{host}:{port}/dashboard")
    uvicorn.run(app, host=host, port=port, log_level="warning")
