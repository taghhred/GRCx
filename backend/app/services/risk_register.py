"""Persist Risk Register rows from Excel into the database."""

from __future__ import annotations

import json
import shutil
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.risk import (
    RiskEvidenceRecord,
    RiskHistoryRecord,
    RiskImportLog,
    RiskRecord,
    UploadedRiskFile,
)
from app.services.risk_excel import (
    ParsedRiskRow,
    detect_vendor_from_filename,
    parse_risk_register_bytes,
    safe_filename,
    sha256_bytes,
)


@dataclass
class ImportSummary:
    filename: str
    imported: int
    updated: int
    skipped_duplicates: int
    errors: int
    error_messages: list[str]
    file_id: str | None = None


def risk_files_dir() -> Path:
    settings = get_settings()
    root = Path(__file__).resolve().parents[2]  # backend/
    data_dir = root / "data" / "RiskAssessment"
    upload_dir = root / "uploads" / "risk-files"
    upload_dir.mkdir(parents=True, exist_ok=True)
    data_dir.mkdir(parents=True, exist_ok=True)
    _ = settings
    return data_dir


def uploads_dir() -> Path:
    root = Path(__file__).resolve().parents[2]
    path = root / "uploads" / "risk-files"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _apply_row(
    db: Session,
    row: ParsedRiskRow,
    *,
    file_row: UploadedRiskFile | None,
    actor: str,
    mode: str,
) -> str:
    """Return action: imported | updated | skipped."""
    existing = db.query(RiskRecord).filter(RiskRecord.risk_id == row.risk_id).first()
    vendor = row.vendor or (file_row.source_vendor if file_row else None)

    if existing is None:
        record = RiskRecord(
            risk_id=row.risk_id,
            title=row.title,
            category=row.category,
            affected_asset=row.affected_asset,
            business_unit=row.business_unit,
            department=row.department,
            vendor=vendor,
            owner=row.owner,
            description=row.description,
            inherent_likelihood=row.inherent_likelihood,
            inherent_impact=row.inherent_impact,
            inherent_score=row.inherent_score,
            inherent_level=row.inherent_level,
            treatment=row.treatment,
            planned_controls=row.planned_controls,
            framework=row.framework,
            framework_control_ref=row.framework_control_ref,
            residual_likelihood=row.residual_likelihood,
            residual_impact=row.residual_impact,
            residual_score=row.residual_score,
            residual_level=row.residual_level,
            status=row.status,
            date_identified=row.date_identified,
            next_review_date=row.next_review_date,
            notes=row.notes,
            source_file_id=file_row.id if file_row else None,
            source_filename=file_row.original_filename if file_row else None,
            created_by=actor,
            updated_by=actor,
        )
        db.add(record)
        db.flush()
        if row.evidence_code:
            db.add(
                RiskEvidenceRecord(
                    risk_id=record.id,
                    evidence_code=row.evidence_code,
                    filename=f"{row.evidence_code}.ref",
                    file_type="reference",
                    uploaded_by=actor,
                    description="Linked evidence ID from Excel metadata",
                )
            )
        db.add(
            RiskHistoryRecord(
                risk_id=record.id,
                actor=actor,
                action="Imported",
                detail=f"Imported from {file_row.original_filename if file_row else 'upload'}",
            )
        )
        return "imported"

    if mode == "skip-duplicates":
        return "skipped"

    # update
    existing.title = row.title
    existing.category = row.category
    existing.affected_asset = row.affected_asset
    existing.business_unit = row.business_unit
    existing.department = row.department
    existing.vendor = vendor or existing.vendor
    existing.owner = row.owner
    existing.description = row.description
    existing.inherent_likelihood = row.inherent_likelihood
    existing.inherent_impact = row.inherent_impact
    existing.inherent_score = row.inherent_score
    existing.inherent_level = row.inherent_level
    existing.treatment = row.treatment
    existing.planned_controls = row.planned_controls
    existing.framework = row.framework
    existing.framework_control_ref = row.framework_control_ref
    existing.residual_likelihood = row.residual_likelihood
    existing.residual_impact = row.residual_impact
    existing.residual_score = row.residual_score
    existing.residual_level = row.residual_level
    existing.status = row.status
    existing.date_identified = row.date_identified
    existing.next_review_date = row.next_review_date
    existing.notes = row.notes
    if file_row:
        existing.source_file_id = file_row.id
        existing.source_filename = file_row.original_filename
    existing.updated_by = actor
    db.add(
        RiskHistoryRecord(
            risk_id=existing.id,
            actor=actor,
            action="Updated from import",
            detail=f"Updated from {file_row.original_filename if file_row else 'upload'}",
        )
    )
    return "updated"


def import_workbook_bytes(
    db: Session,
    *,
    data: bytes,
    filename: str,
    actor: str = "System",
    mode: str = "append-update",
    persist_file: bool = True,
) -> ImportSummary:
    safe_name = safe_filename(filename)
    digest = sha256_bytes(data)
    parsed = parse_risk_register_bytes(data)

    file_row: UploadedRiskFile | None = None
    if persist_file:
        existing_file = (
            db.query(UploadedRiskFile)
            .filter(UploadedRiskFile.content_sha256 == digest)
            .first()
        )
        if existing_file is None:
            dest = uploads_dir() / f"{digest[:16]}_{safe_name}"
            dest.write_bytes(data)
            file_row = UploadedRiskFile(
                filename=dest.name,
                original_filename=safe_name,
                storage_path=str(dest.relative_to(Path(__file__).resolve().parents[2])),
                content_sha256=digest,
                byte_size=len(data),
                source_vendor=detect_vendor_from_filename(safe_name),
                imported_by=actor,
                version="1.0",
                record_count=0,
            )
            db.add(file_row)
            db.flush()
        else:
            file_row = existing_file

    imported = updated = skipped = 0
    for row in parsed.rows:
        if mode == "skip-duplicates":
            action = _apply_row(db, row, file_row=file_row, actor=actor, mode=mode)
        else:
            action = _apply_row(
                db, row, file_row=file_row, actor=actor, mode="append-update"
            )
        if action == "imported":
            imported += 1
        elif action == "updated":
            updated += 1
        else:
            skipped += 1

    if file_row:
        file_row.record_count = imported + updated

    log = RiskImportLog(
        uploaded_file_id=file_row.id if file_row else None,
        filename=safe_name,
        imported_by=actor,
        imported=imported,
        updated=updated,
        skipped_duplicates=skipped,
        errors=len(parsed.errors),
        summary_json=json.dumps({"parse_errors": parsed.errors[:50]}),
    )
    db.add(log)
    db.commit()

    return ImportSummary(
        filename=safe_name,
        imported=imported,
        updated=updated,
        skipped_duplicates=skipped,
        errors=len(parsed.errors),
        error_messages=parsed.errors[:50],
        file_id=file_row.id if file_row else None,
    )


def sync_seed_folder(db: Session, actor: str = "System") -> list[ImportSummary]:
    """Import every workbook under backend/data/RiskAssessment if DB has no risks."""
    folder = risk_files_dir()
    summaries: list[ImportSummary] = []
    for path in sorted(folder.glob("*.xlsx")):
        # Always copy into uploads for permanence, then import (append-update).
        data = path.read_bytes()
        dest = uploads_dir() / path.name
        if not dest.exists():
            shutil.copy2(path, dest)
        summaries.append(
            import_workbook_bytes(
                db,
                data=data,
                filename=path.name,
                actor=actor,
                mode="append-update",
                persist_file=True,
            )
        )
    return summaries


def ensure_risks_seeded(db: Session) -> None:
    if db.query(RiskRecord).count() > 0:
        return
    sync_seed_folder(db)


def risk_to_dict(row: RiskRecord) -> dict:
    return {
        "id": row.id,
        "riskId": row.risk_id,
        "title": row.title,
        "category": row.category,
        "affectedAsset": row.affected_asset or "",
        "businessUnit": row.business_unit or "",
        "department": row.department or "",
        "vendor": row.vendor or "",
        "owner": row.owner,
        "description": row.description or "",
        "inherentLikelihood": row.inherent_likelihood,
        "inherentImpact": row.inherent_impact,
        "inherentScore": row.inherent_score,
        "inherentLevel": row.inherent_level or "Medium",
        "treatment": row.treatment or "",
        "plannedControls": row.planned_controls or "",
        "framework": row.framework or "",
        "frameworkControlRef": row.framework_control_ref or "",
        "residualLikelihood": row.residual_likelihood,
        "residualImpact": row.residual_impact,
        "residualScore": row.residual_score,
        "residualLevel": row.residual_level or "Medium",
        "status": row.status,
        "dateIdentified": row.date_identified.isoformat() if row.date_identified else "",
        "nextReviewDate": row.next_review_date.isoformat() if row.next_review_date else "",
        "notes": row.notes or "",
        "sourceFilename": row.source_filename or "",
        "sourceFileId": row.source_file_id,
        "lastUpdated": row.updated_at.isoformat() if row.updated_at else "",
        "createdAt": row.created_at.isoformat() if row.created_at else "",
        "evidence": [
            {
                "id": e.id,
                "evidenceCode": e.evidence_code,
                "filename": e.filename,
                "fileType": e.file_type,
                "uploadedBy": e.uploaded_by,
                "uploadedAt": e.uploaded_at.isoformat() if e.uploaded_at else "",
                "description": e.description,
            }
            for e in row.evidence
        ],
        "history": [
            {
                "id": h.id,
                "actor": h.actor,
                "action": h.action,
                "detail": h.detail,
                "createdAt": h.created_at.isoformat() if h.created_at else "",
            }
            for h in sorted(row.history, key=lambda x: x.created_at, reverse=True)
        ],
    }
