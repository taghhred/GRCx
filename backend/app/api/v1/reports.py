"""Reports persistence API — metadata + optional PDF blob storage."""

from __future__ import annotations

import base64
import json
import re
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_permissions
from app.core.rate_limit import enforce_named_rate_limit
from app.models.operational import ReportRecord, ReportSchedule
from app.models.user import User
from app.services.audit import write_audit

router = APIRouter(prefix="/reports", tags=["reports"])


def _pdf_dir() -> Path:
    path = Path(__file__).resolve().parents[3] / "uploads" / "reports"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _safe_report_id(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", value).strip("-")
    return cleaned[:80] or "report"


def _to_out(row: ReportRecord) -> dict:
    try:
        payload = json.loads(row.payload_json)
    except json.JSONDecodeError:
        payload = {}
    payload["id"] = row.id
    payload["reportId"] = row.report_id
    payload["name"] = row.name
    payload["status"] = row.status
    payload["pages"] = row.pages
    payload["pdfDataUrl"] = None  # never embed huge blobs in list; use download endpoint
    payload["hasPdf"] = bool(row.pdf_storage_path)
    return payload


class ReportUpsert(BaseModel):
    report: dict = Field(default_factory=dict)
    pdfBase64: str | None = None


@router.get("")
def list_reports(
    archived: bool = False,
    q: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("reports:read")),
) -> list[dict]:
    query = db.query(ReportRecord).filter(ReportRecord.is_archived == (1 if archived else 0))
    rows = query.order_by(ReportRecord.updated_at.desc()).limit(200).all()
    out = [_to_out(r) for r in rows]
    if q:
        needle = q.lower()
        out = [r for r in out if needle in json.dumps(r, ensure_ascii=False).lower()]
    return out


# Schedules must be registered before /{report_id} so "schedules" is not captured as an id.
@router.get("/schedules/list")
def list_schedules(
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("reports:read")),
) -> list[dict]:
    rows = db.query(ReportSchedule).order_by(ReportSchedule.created_at.desc()).all()
    out = []
    for r in rows:
        try:
            out.append(json.loads(r.payload_json))
        except json.JSONDecodeError:
            continue
    return out


@router.post("/schedules")
def upsert_schedule(
    body: dict,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("reports:write")),
) -> dict:
    sid = str(body.get("id") or "")
    if not sid:
        raise HTTPException(status_code=400, detail="id required")
    row = db.query(ReportSchedule).filter(ReportSchedule.schedule_id == sid).first()
    blob = json.dumps(body, ensure_ascii=False)
    if row is None:
        db.add(ReportSchedule(schedule_id=sid, payload_json=blob))
    else:
        row.payload_json = blob
    db.commit()
    return body


@router.get("/{report_id}")
def get_report(
    report_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("reports:read")),
) -> dict:
    row = (
        db.query(ReportRecord)
        .filter((ReportRecord.report_id == report_id) | (ReportRecord.id == report_id))
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Report not found")
    data = _to_out(row)
    # Include data URL only for single fetch if file exists and small enough? Prefer download.
    return data


@router.post("")
def upsert_report(
    body: ReportUpsert,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_permissions("reports:write")),
) -> dict:
    enforce_named_rate_limit(request, "reports", max_attempts=20, window_seconds=60)
    report = dict(body.report or {})
    report_id = str(report.get("reportId") or report.get("id") or "")
    if not report_id:
        raise HTTPException(status_code=400, detail="reportId required")

    row = db.query(ReportRecord).filter(ReportRecord.report_id == report_id).first()
    pdf_path = row.pdf_storage_path if row else None
    if body.pdfBase64:
        raw = body.pdfBase64
        if raw.startswith("data:"):
            raw = raw.split(",", 1)[-1]
        try:
            content = base64.b64decode(raw, validate=False)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=400, detail="Invalid PDF payload") from exc
        if len(content) > 25 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="PDF too large")
        if not content.startswith(b"%PDF"):
            raise HTTPException(status_code=400, detail="Not a PDF")
        dest = _pdf_dir() / f"{_safe_report_id(report_id)}.pdf"
        dest.write_bytes(content)
        pdf_path = str(dest)

    fields = dict(
        report_id=report_id,
        name=str(report.get("name") or "Report")[:255],
        category=report.get("category"),
        report_type=report.get("reportType"),
        status=str(report.get("status") or "Ready"),
        issue_date=report.get("issueDate"),
        generated_time=report.get("generatedTime"),
        generated_by=report.get("generatedBy") or (user.full_name or "").split()[0],
        department=report.get("department") or user.department,
        classification=report.get("classification"),
        pages=int(report.get("pages") or 0),
        pdf_storage_path=pdf_path,
        payload_json=json.dumps(report, ensure_ascii=False),
    )

    if row is None:
        row = ReportRecord(**fields)
        db.add(row)
    else:
        for k, v in fields.items():
            setattr(row, k, v)

    write_audit(
        db,
        action="reports.upsert",
        actor_id=user.id,
        actor_name=user.full_name,
        resource_type="report",
        resource_id=report_id,
    )
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.get("/{report_id}/pdf")
def download_pdf(
    report_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("reports:read")),
) -> Response:
    row = (
        db.query(ReportRecord)
        .filter((ReportRecord.report_id == report_id) | (ReportRecord.id == report_id))
        .first()
    )
    if not row or not row.pdf_storage_path:
        raise HTTPException(status_code=404, detail="PDF not found")
    path = Path(row.pdf_storage_path).resolve()
    root = _pdf_dir().resolve()
    try:
        path.relative_to(root)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid path") from exc
    if not path.exists():
        raise HTTPException(status_code=404, detail="PDF missing on disk")
    return FileResponse(path, media_type="application/pdf", filename=path.name)
