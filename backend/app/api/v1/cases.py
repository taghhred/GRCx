from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_permissions, require_roles
from app.models.soar_case import SoarCase
from app.models.user import User
from app.schemas.domain import (
    SoarCaseCreate,
    SoarCaseOut,
    SoarCaseUpdate,
    SoarIntakeRequest,
)
from app.services.audit import write_audit

router = APIRouter(prefix="/cases", tags=["soar-cases"])


@router.get("", response_model=list[SoarCaseOut])
def list_cases(
    status_filter: str | None = Query(None, alias="status"),
    assigned_to: str | None = None,
    archived: bool | None = False,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("cases:read")),
) -> list[SoarCase]:
    q = db.query(SoarCase)
    if archived is not None:
        q = q.filter(SoarCase.archived.is_(archived))
    if status_filter:
        q = q.filter(SoarCase.status == status_filter)
    if assigned_to:
        q = q.filter(SoarCase.assigned_to == assigned_to)
    return q.order_by(SoarCase.updated_at.desc()).limit(500).all()


@router.get("/{case_id}", response_model=SoarCaseOut)
def get_case(
    case_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("cases:read")),
) -> SoarCase:
    row = db.query(SoarCase).filter(SoarCase.case_id == case_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Case not found")
    return row


@router.post("", response_model=SoarCaseOut, status_code=status.HTTP_201_CREATED)
def create_case(
    body: SoarCaseCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("Admin", "GRC Specialist")),
) -> SoarCase:
    if db.query(SoarCase).filter(SoarCase.case_id == body.case_id).first():
        raise HTTPException(status_code=409, detail="Case ID already exists")
    row = SoarCase(**body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    write_audit(
        db,
        action="cases.create",
        actor_id=user.id,
        actor_name=user.full_name,
        resource_type="soar_case",
        resource_id=row.case_id,
    )
    return row


@router.patch("/{case_id}", response_model=SoarCaseOut)
def update_case(
    case_id: str,
    body: SoarCaseUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("Admin", "GRC Specialist")),
) -> SoarCase:
    row = db.query(SoarCase).filter(SoarCase.case_id == case_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Case not found")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    write_audit(
        db,
        action="cases.update",
        actor_id=user.id,
        actor_name=user.full_name,
        resource_type="soar_case",
        resource_id=row.case_id,
    )
    return row


@router.post("/intake", response_model=SoarCaseOut, status_code=status.HTTP_201_CREATED)
def soar_intake(
    body: SoarIntakeRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("Admin", "GRC Specialist")),
) -> SoarCase:
    """Local SOAR → GRCx intake endpoint (Phase 1 skeleton)."""
    case_id = f"GRC-{body.external_alert_id[-6:].upper()}"
    existing = db.query(SoarCase).filter(SoarCase.case_id == case_id).first()
    if existing:
        return existing
    row = SoarCase(
        case_id=case_id,
        title=body.title,
        severity=body.severity,
        status="New",
        framework=body.framework,
        control=body.control,
        affected_asset=body.affected_asset,
        department=body.department,
        specialization=body.specialization,
        assigned_to=user.full_name,
        owner=user.full_name,
        sla_state="On Track",
        payload_json=body.description,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    write_audit(
        db,
        action="cases.soar_intake",
        actor_id=user.id,
        actor_name=user.full_name,
        resource_type="soar_case",
        resource_id=row.case_id,
        detail=f"alert={body.external_alert_id}",
    )
    return row
