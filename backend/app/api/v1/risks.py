"""Risk Assessment / Risk Register API."""

from __future__ import annotations

from collections import Counter
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_permissions
from app.models.risk import RiskHistoryRecord, RiskRecord, UploadedRiskFile
from app.models.user import User
from app.schemas.risk import ImportSummaryOut, RiskCreate, RiskOut, RiskStatsOut, RiskUpdate
from app.services.audit import write_audit
from app.services.risk_register import (
    ensure_risks_seeded,
    import_workbook_bytes,
    risk_to_dict,
    sync_seed_folder,
    uploads_dir,
)

router = APIRouter(prefix="/risks", tags=["risk-assessment"])


def _stats(rows: list[RiskRecord]) -> RiskStatsOut:
    def level_of(r: RiskRecord) -> str:
        return (r.residual_level or r.inherent_level or "Medium").title()

    levels = Counter(level_of(r) for r in rows)
    return RiskStatsOut(
        total=len(rows),
        critical=levels.get("Critical", 0),
        high=levels.get("High", 0),
        medium=levels.get("Medium", 0),
        low=levels.get("Low", 0),
        byDepartment=dict(Counter((r.department or "Unspecified") for r in rows)),
        byVendor=dict(Counter((r.vendor or "Unspecified") for r in rows)),
        byFramework=dict(Counter((r.framework or "Unspecified") for r in rows)),
        byStatus=dict(Counter(r.status for r in rows)),
        byLevel=dict(levels),
    )


@router.get("", response_model=list[RiskOut])
def list_risks(
    q: str | None = None,
    department: str | None = None,
    business_unit: str | None = None,
    vendor: str | None = None,
    category: str | None = None,
    level: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    owner: str | None = None,
    framework: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("risk:read")),
) -> list[dict[str, Any]]:
    ensure_risks_seeded(db)
    query = db.query(RiskRecord).filter(RiskRecord.is_archived.is_(False))
    if department:
        query = query.filter(RiskRecord.department == department)
    if business_unit:
        query = query.filter(RiskRecord.business_unit == business_unit)
    if vendor:
        query = query.filter(RiskRecord.vendor == vendor)
    if category:
        query = query.filter(RiskRecord.category == category)
    if status_filter:
        query = query.filter(RiskRecord.status == status_filter)
    if owner:
        query = query.filter(RiskRecord.owner == owner)
    if framework:
        query = query.filter(RiskRecord.framework == framework)
    if level:
        query = query.filter(
            (RiskRecord.residual_level == level) | (RiskRecord.inherent_level == level)
        )
    rows = query.order_by(RiskRecord.updated_at.desc()).limit(2000).all()
    if q:
        needle = q.strip().lower()
        rows = [
            r
            for r in rows
            if needle in r.risk_id.lower()
            or needle in r.title.lower()
            or needle in (r.owner or "").lower()
            or needle in (r.description or "").lower()
            or needle in (r.affected_asset or "").lower()
        ]
    return [risk_to_dict(r) for r in rows]


@router.get("/stats", response_model=RiskStatsOut)
def risk_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("risk:read")),
) -> RiskStatsOut:
    ensure_risks_seeded(db)
    rows = db.query(RiskRecord).filter(RiskRecord.is_archived.is_(False)).all()
    return _stats(rows)


@router.post("/sync-folder", response_model=list[ImportSummaryOut])
def sync_folder(
    db: Session = Depends(get_db),
    user: User = Depends(require_permissions("risk:write")),
) -> list[ImportSummaryOut]:
    summaries = sync_seed_folder(db, actor=user.full_name)
    write_audit(
        db,
        action="risk.folder_synced",
        actor_id=user.id,
        actor_name=user.full_name,
        resource_type="risk_register",
        resource_id="folder",
    )
    return [
        ImportSummaryOut(
            filename=s.filename,
            imported=s.imported,
            updated=s.updated,
            skipped_duplicates=s.skipped_duplicates,
            errors=s.errors,
            error_messages=s.error_messages,
            file_id=s.file_id,
        )
        for s in summaries
    ]


@router.post("/import", response_model=ImportSummaryOut)
async def import_excel(
    file: UploadFile = File(...),
    mode: str = Query("append-update"),
    db: Session = Depends(get_db),
    user: User = Depends(require_permissions("risk:write")),
) -> ImportSummaryOut:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename required")
    data = await file.read()
    try:
        summary = import_workbook_bytes(
            db,
            data=data,
            filename=file.filename,
            actor=user.full_name,
            mode=mode if mode in {"append-update", "skip-duplicates", "append"} else "append-update",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    write_audit(
        db,
        action="risk.imported",
        actor_id=user.id,
        actor_name=user.full_name,
        resource_type="risk_register",
        resource_id=summary.filename,
    )
    return ImportSummaryOut(
        filename=summary.filename,
        imported=summary.imported,
        updated=summary.updated,
        skipped_duplicates=summary.skipped_duplicates,
        errors=summary.errors,
        error_messages=summary.error_messages,
        file_id=summary.file_id,
    )


@router.get("/files/{file_id}/download")
def download_source_file(
    file_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("risk:read")),
) -> FileResponse:
    from pathlib import Path

    meta = db.query(UploadedRiskFile).filter(UploadedRiskFile.id == file_id).first()
    if not meta:
        raise HTTPException(status_code=404, detail="File not found")
    backend_root = Path(__file__).resolve().parents[3]
    uploads_root = uploads_dir().resolve()
    candidates: list[Path] = []
    if meta.storage_path:
        candidates.append((backend_root / meta.storage_path).resolve())
    candidates.append((uploads_dir() / meta.filename).resolve())

    full: Path | None = None
    for candidate in candidates:
        try:
            candidate.relative_to(uploads_root)
        except ValueError:
            continue
        if candidate.is_file():
            full = candidate
            break
    if full is None:
        raise HTTPException(status_code=404, detail="Stored file missing")
    return FileResponse(
        path=str(full),
        filename=meta.original_filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@router.get("/{risk_id}", response_model=RiskOut)
def get_risk(
    risk_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("risk:read")),
) -> dict[str, Any]:
    row = db.query(RiskRecord).filter(RiskRecord.risk_id == risk_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Risk not found")
    return risk_to_dict(row)


@router.post("", response_model=RiskOut, status_code=status.HTTP_201_CREATED)
def create_risk(
    body: RiskCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permissions("risk:write")),
) -> dict[str, Any]:
    if db.query(RiskRecord).filter(RiskRecord.risk_id == body.risk_id).first():
        raise HTTPException(status_code=409, detail="Duplicate Risk ID")
    score = body.inherent_score
    if score is None and body.inherent_likelihood is not None and body.inherent_impact is not None:
        score = body.inherent_likelihood * body.inherent_impact
    residual_score = body.residual_score
    if (
        residual_score is None
        and body.residual_likelihood is not None
        and body.residual_impact is not None
    ):
        residual_score = body.residual_likelihood * body.residual_impact
    row = RiskRecord(
        risk_id=body.risk_id,
        title=body.title,
        category=body.category,
        affected_asset=body.affected_asset,
        business_unit=body.business_unit,
        department=body.department or body.business_unit,
        vendor=body.vendor,
        owner=body.owner,
        description=body.description,
        inherent_likelihood=body.inherent_likelihood,
        inherent_impact=body.inherent_impact,
        inherent_score=score,
        inherent_level=body.inherent_level,
        treatment=body.treatment,
        planned_controls=body.planned_controls,
        framework=body.framework,
        framework_control_ref=body.framework_control_ref,
        residual_likelihood=body.residual_likelihood,
        residual_impact=body.residual_impact,
        residual_score=residual_score,
        residual_level=body.residual_level,
        status=body.status,
        date_identified=body.date_identified,
        next_review_date=body.next_review_date,
        notes=body.notes,
        created_by=user.id,
        updated_by=user.id,
    )
    db.add(row)
    db.flush()
    db.add(
        RiskHistoryRecord(
            risk_id=row.id,
            actor=user.full_name,
            action="Created",
            detail="Manual risk entry",
        )
    )
    db.commit()
    db.refresh(row)
    write_audit(
        db,
        action="risk.created",
        actor_id=user.id,
        actor_name=user.full_name,
        resource_type="risk_record",
        resource_id=row.risk_id,
    )
    return risk_to_dict(row)


@router.patch("/{risk_id}", response_model=RiskOut)
def update_risk(
    risk_id: str,
    body: RiskUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permissions("risk:write")),
) -> dict[str, Any]:
    row = db.query(RiskRecord).filter(RiskRecord.risk_id == risk_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Risk not found")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    row.updated_by = user.id
    db.add(
        RiskHistoryRecord(
            risk_id=row.id,
            actor=user.full_name,
            action="Edited",
            detail="Risk record updated",
        )
    )
    db.commit()
    db.refresh(row)
    write_audit(
        db,
        action="risk.updated",
        actor_id=user.id,
        actor_name=user.full_name,
        resource_type="risk_record",
        resource_id=row.risk_id,
    )
    return risk_to_dict(row)


@router.delete("/{risk_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def delete_risk(
    risk_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_permissions("risk:write")),
) -> Response:
    row = db.query(RiskRecord).filter(RiskRecord.risk_id == risk_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Risk not found")
    row.is_archived = True
    row.status = "Archived"
    row.updated_by = user.id
    db.add(
        RiskHistoryRecord(
            risk_id=row.id,
            actor=user.full_name,
            action="Archived",
            detail="Risk archived / soft-deleted",
        )
    )
    db.commit()
    write_audit(
        db,
        action="risk.archived",
        actor_id=user.id,
        actor_name=user.full_name,
        resource_type="risk_record",
        resource_id=row.risk_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
