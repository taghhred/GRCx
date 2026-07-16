"""Seed + CRUD helpers for operational module JSON documents."""

from __future__ import annotations

import json
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.operational import (
    OperationalDocument,
    ReportRecord,
    ReportSchedule,
)

SEED_DIR = Path(__file__).resolve().parents[2] / "data" / "seeds"

MODULE_ASSET = "compliance_asset"
MODULE_IDENTITY = "identity"
MODULE_BCM = "bcm_process"
MODULE_BCM_META = "bcm_meta"
MODULE_DR_SYSTEM = "dr_system"
MODULE_DR_META = "dr_meta"
MODULE_ORG = "dashboard_org"
MODULE_RESP = "dashboard_resp"


def _load_json(name: str) -> dict | list | None:
    path = SEED_DIR / name
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def _upsert_doc(
    db: Session,
    *,
    module: str,
    business_key: str,
    payload: dict,
    title: str | None = None,
    department: str | None = None,
    status: str | None = None,
) -> None:
    row = (
        db.query(OperationalDocument)
        .filter(
            OperationalDocument.module == module,
            OperationalDocument.business_key == business_key,
        )
        .first()
    )
    blob = json.dumps(payload, ensure_ascii=False)
    if row is None:
        db.add(
            OperationalDocument(
                module=module,
                business_key=business_key,
                title=title,
                department=department,
                status=status,
                payload_json=blob,
            )
        )
    else:
        row.payload_json = blob
        row.title = title
        row.department = department
        row.status = status
        row.is_archived = 0


def list_payloads(db: Session, module: str) -> list[dict]:
    rows = (
        db.query(OperationalDocument)
        .filter(
            OperationalDocument.module == module,
            OperationalDocument.is_archived == 0,
        )
        .order_by(OperationalDocument.business_key.asc())
        .all()
    )
    out: list[dict] = []
    for r in rows:
        try:
            out.append(json.loads(r.payload_json))
        except json.JSONDecodeError:
            continue
    return out


def replace_module_rows(db: Session, module: str, rows: list[dict], key_field: str = "id") -> int:
    """Full replace of a module's documents (safe for demo sync)."""
    db.query(OperationalDocument).filter(OperationalDocument.module == module).delete()
    for row in rows:
        key = str(row.get(key_field) or row.get("id") or "")
        if not key:
            continue
        _upsert_doc(
            db,
            module=module,
            business_key=key,
            payload=row,
            title=str(row.get("name") or row.get("employee") or row.get("system") or key)[:255],
            department=str(row.get("department") or "")[:120] or None,
            status=str(
                row.get("complianceStatus")
                or row.get("status")
                or row.get("policyStatus")
                or row.get("recoveryStatus")
                or ""
            )[:80]
            or None,
        )
    return len(rows)


def ensure_operational_seeded(db: Session) -> None:
    """Idempotent: seed only when module tables are empty."""
    if db.query(OperationalDocument).filter(OperationalDocument.module == MODULE_IDENTITY).count() == 0:
        data = _load_json("identity.json") or {}
        for row in data.get("identities") or []:
            _upsert_doc(
                db,
                module=MODULE_IDENTITY,
                business_key=str(row["id"]),
                payload=row,
                title=row.get("employee"),
                department=row.get("department"),
                status=row.get("policyStatus"),
            )
        if data.get("departments"):
            _upsert_doc(
                db,
                module=MODULE_IDENTITY,
                business_key="__meta_departments",
                payload={"departments": data["departments"]},
                title="departments",
            )

    if db.query(OperationalDocument).filter(OperationalDocument.module == MODULE_ASSET).count() == 0:
        data = _load_json("compliance_assets.json") or {}
        for row in data.get("assets") or []:
            _upsert_doc(
                db,
                module=MODULE_ASSET,
                business_key=str(row["id"]),
                payload=row,
                title=row.get("name"),
                department=row.get("department"),
                status=row.get("complianceStatus"),
            )
        _upsert_doc(
            db,
            module=MODULE_ASSET,
            business_key="__meta",
            payload={
                "departments": data.get("departments") or [],
                "frameworks": data.get("frameworks") or [],
            },
            title="meta",
        )

    if db.query(OperationalDocument).filter(OperationalDocument.module == MODULE_BCM).count() == 0:
        data = _load_json("bcm.json") or {}
        for row in data.get("processes") or []:
            _upsert_doc(
                db,
                module=MODULE_BCM,
                business_key=str(row["id"]),
                payload=row,
                title=row.get("name"),
                department=row.get("department"),
                status=row.get("status"),
            )
        _upsert_doc(
            db,
            module=MODULE_BCM_META,
            business_key="dashboard",
            payload={
                "kpis": data.get("kpis") or [],
                "activities": data.get("activities") or [],
                "recommendations": data.get("recommendations") or [],
            },
            title="bcm_meta",
        )

    if db.query(OperationalDocument).filter(OperationalDocument.module == MODULE_DR_SYSTEM).count() == 0:
        data = _load_json("dr.json") or {}
        for row in data.get("systems") or []:
            _upsert_doc(
                db,
                module=MODULE_DR_SYSTEM,
                business_key=str(row["id"]),
                payload=row,
                title=row.get("system"),
                status=row.get("recoveryStatus"),
            )
        meta = {k: v for k, v in data.items() if k != "systems"}
        _upsert_doc(
            db,
            module=MODULE_DR_META,
            business_key="dashboard",
            payload=meta,
            title="dr_meta",
        )

    if db.query(OperationalDocument).filter(OperationalDocument.module == MODULE_ORG).count() == 0:
        data = _load_json("dashboard_org.json") or {}
        if data.get("orgTree"):
            _upsert_doc(
                db,
                module=MODULE_ORG,
                business_key="tree",
                payload=data["orgTree"],
                title="org_tree",
            )
        for row in data.get("responsibilities") or []:
            _upsert_doc(
                db,
                module=MODULE_RESP,
                business_key=str(row.get("id")),
                payload=row,
                title=row.get("name"),
                department=row.get("department"),
            )

    if db.query(ReportRecord).count() == 0:
        # Minimal demo report metadata (PDF generated client-side on demand)
        demo = {
            "id": "rep-seed-1",
            "reportId": "RPT-1001",
            "name": "Executive GRC Summary",
            "category": "Executive",
            "reportType": "Executive Report",
            "reportingPeriod": "This Month",
            "periodStart": "2026-07-01",
            "periodEnd": "2026-07-16",
            "issueDate": "2026-07-16",
            "createdAt": "2026-07-16T10:00:00",
            "generatedBy": "Mohammed",
            "userPosition": "GRC Specialist",
            "department": "GRC",
            "organizationName": "GRCx Financial Group",
            "generatedTime": "10:00",
            "dayOfWeek": "Thursday",
            "version": "1.0",
            "auditor": "Sara",
            "auditorRole": "Auditor",
            "frameworks": ["NCA ECC", "ISO 27001"],
            "status": "Ready",
            "pages": 8,
            "scope": {"modules": ["Risk", "Compliance"], "frameworks": ["NCA ECC"], "departments": []},
            "sections": [],
            "metadata": {
                "title": "Executive GRC Summary",
                "description": "Seeded demo report",
                "issueDate": "2026-07-16",
                "auditorName": "Sara",
                "auditorRole": "Auditor",
                "preparedBy": "Mohammed",
                "approvedBy": "",
                "organizationName": "GRCx Financial Group",
                "classification": "Internal",
            },
            "watermark": {
                "enabled": True,
                "text": "INTERNAL",
                "opacity": 0.12,
                "position": "diagonal",
                "rotation": -30,
                "fontSize": 48,
            },
            "content": {
                "pages": [],
                "pageCount": 8,
                "executiveNarrative": "Demo executive narrative.",
                "keyRecommendations": ["Maintain control testing cadence."],
                "summaryMetrics": [],
            },
            "approvalStatus": "Pending",
            "watermarkEnabled": True,
            "classification": "Internal",
        }
        db.add(
            ReportRecord(
                report_id=demo["reportId"],
                name=demo["name"],
                category=demo["category"],
                report_type=demo["reportType"],
                status=demo["status"],
                issue_date=demo["issueDate"],
                generated_time=demo["generatedTime"],
                generated_by=demo["generatedBy"],
                department=demo["department"],
                classification=demo["classification"],
                pages=demo["pages"],
                payload_json=json.dumps(demo, ensure_ascii=False),
            )
        )

    db.commit()
