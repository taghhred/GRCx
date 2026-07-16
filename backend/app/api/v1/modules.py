"""APIs for Compliance assets, Identity, BCM, DR, and compliance bundle."""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_permissions
from app.core.rate_limit import enforce_named_rate_limit
from app.models.operational import (
    ComplianceAssessmentItem,
    ComplianceEvidenceItem,
    ComplianceRegisterItem,
    OperationalDocument,
)
from app.models.user import User
from app.services.operational_seed import (
    MODULE_ASSET,
    MODULE_BCM,
    MODULE_BCM_META,
    MODULE_DR_META,
    MODULE_DR_SYSTEM,
    MODULE_IDENTITY,
    _upsert_doc,
    list_payloads,
    replace_module_rows,
)
from fastapi import Request

router = APIRouter(tags=["operational-modules"])


class RowsReplaceBody(BaseModel):
    rows: list[dict[str, Any]] = Field(default_factory=list)


def _meta_payload(db: Session, module: str, key: str = "__meta") -> dict:
    row = (
        db.query(OperationalDocument)
        .filter(
            OperationalDocument.module == module,
            OperationalDocument.business_key == key,
        )
        .first()
    )
    if not row:
        return {}
    try:
        return json.loads(row.payload_json)
    except json.JSONDecodeError:
        return {}


# ── Compliance (Asset Compliance page) ──────────────────────────────────────


@router.get("/compliance/assets")
def list_compliance_assets(
    q: str | None = None,
    department: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("compliance:read")),
) -> dict:
    assets = [
        a
        for a in list_payloads(db, MODULE_ASSET)
        if a.get("id")  # skip meta if any leaked
    ]
    meta = _meta_payload(db, MODULE_ASSET, "__meta")
    if q:
        needle = q.lower()
        assets = [
            a
            for a in assets
            if needle in json.dumps(a, ensure_ascii=False).lower()
        ]
    if department and department != "All":
        assets = [a for a in assets if a.get("department") == department]
    if status and status != "All":
        assets = [a for a in assets if a.get("complianceStatus") == status]
    return {
        "assets": assets,
        "departments": meta.get("departments")
        or sorted({str(a.get("department")) for a in assets if a.get("department")}),
        "frameworks": meta.get("frameworks") or [],
    }


@router.put("/compliance/assets")
def replace_compliance_assets(
    body: RowsReplaceBody,
    request: Request,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("compliance:write")),
) -> dict:
    enforce_named_rate_limit(request, "import", max_attempts=30, window_seconds=60)
    n = replace_module_rows(db, MODULE_ASSET, body.rows, key_field="id")
    # preserve meta
    meta = _meta_payload(db, MODULE_ASSET, "__meta")
    if meta:
        row = (
            db.query(OperationalDocument)
            .filter(
                OperationalDocument.module == MODULE_ASSET,
                OperationalDocument.business_key == "__meta",
            )
            .first()
        )
        if row is None:
            db.add(
                OperationalDocument(
                    module=MODULE_ASSET,
                    business_key="__meta",
                    title="meta",
                    payload_json=json.dumps(meta, ensure_ascii=False),
                )
            )
    db.commit()
    return {"ok": True, "count": n}


@router.get("/compliance/bundle")
def compliance_bundle(
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("compliance:read")),
) -> dict:
    """Compliance Management bundle (register/assessments/evidence)."""

    def loads(rows: list) -> list[dict]:
        out = []
        for r in rows:
            try:
                out.append(json.loads(r.payload_json))
            except json.JSONDecodeError:
                continue
        return out

    register = loads(db.query(ComplianceRegisterItem).all())
    assessments = loads(db.query(ComplianceAssessmentItem).all())
    evidence = loads(db.query(ComplianceEvidenceItem).all())
    # If empty, synthesize light bundle from asset compliance for demo continuity
    if not register:
        assets = list_payloads(db, MODULE_ASSET)
        register = [
            {
                "id": a.get("id"),
                "controlId": a.get("failedControlId") or a.get("id"),
                "controlName": a.get("failedControlName") or a.get("name"),
                "framework": a.get("framework"),
                "owner": a.get("owner"),
                "department": a.get("department"),
                "status": a.get("complianceStatus"),
                "riskLevel": a.get("riskLevel"),
                "lastAssessment": a.get("lastAssessment"),
            }
            for a in assets
            if a.get("id")
        ]
    return {
        "register": register,
        "assessments": assessments,
        "evidence": evidence,
    }


# ── Identity ────────────────────────────────────────────────────────────────


@router.get("/identity/monitoring")
def identity_monitoring(
    q: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("identity:read")),
) -> dict:
    rows = list_payloads(db, MODULE_IDENTITY)
    identities = [r for r in rows if r.get("id") and r.get("employee")]
    meta = next((r for r in rows if r.get("departments")), None)
    departments = (meta or {}).get("departments") or sorted(
        {str(i.get("department")) for i in identities if i.get("department")}
    )
    if q:
        needle = q.lower()
        identities = [
            i for i in identities if needle in json.dumps(i, ensure_ascii=False).lower()
        ]
    return {"identities": identities, "departments": departments}


@router.put("/identity/monitoring")
def replace_identities(
    body: RowsReplaceBody,
    request: Request,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("identity:write")),
) -> dict:
    enforce_named_rate_limit(request, "import", max_attempts=30, window_seconds=60)
    # Keep departments meta
    existing = list_payloads(db, MODULE_IDENTITY)
    meta = next((r for r in existing if r.get("departments") and not r.get("employee")), None)
    n = replace_module_rows(db, MODULE_IDENTITY, body.rows, key_field="id")
    if meta:
        _upsert_doc(
            db,
            module=MODULE_IDENTITY,
            business_key="__meta_departments",
            payload=meta,
            title="departments",
        )
    db.commit()
    return {"ok": True, "count": n}


# ── BCM ─────────────────────────────────────────────────────────────────────


@router.get("/bcm/dashboard")
def bcm_dashboard(
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("bcm:read")),
) -> dict:
    processes = list_payloads(db, MODULE_BCM)
    meta_rows = list_payloads(db, MODULE_BCM_META)
    meta = meta_rows[0] if meta_rows else {}
    return {
        "processes": processes,
        "kpis": meta.get("kpis") or [],
        "activities": meta.get("activities") or [],
        "recommendations": meta.get("recommendations") or [],
    }


@router.put("/bcm/processes")
def replace_bcm_processes(
    body: RowsReplaceBody,
    request: Request,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("bcm:read")),
) -> dict:
    enforce_named_rate_limit(request, "import", max_attempts=30, window_seconds=60)
    n = replace_module_rows(db, MODULE_BCM, body.rows, key_field="id")
    db.commit()
    return {"ok": True, "count": n}


# ── DR ───────────────────────────────────────────────────────────────────────


@router.get("/dr/dashboard")
def dr_dashboard(
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("dr:read")),
) -> dict:
    systems = list_payloads(db, MODULE_DR_SYSTEM)
    meta_rows = list_payloads(db, MODULE_DR_META)
    meta = meta_rows[0] if meta_rows else {}
    return {"systems": systems, **meta}


@router.put("/dr/systems")
def replace_dr_systems(
    body: RowsReplaceBody,
    request: Request,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("dr:read")),
) -> dict:
    enforce_named_rate_limit(request, "import", max_attempts=30, window_seconds=60)
    n = replace_module_rows(db, MODULE_DR_SYSTEM, body.rows, key_field="id")
    db.commit()
    return {"ok": True, "count": n}
