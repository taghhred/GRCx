"""Governance API — policies and KPIs with permission enforcement."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_permissions
from app.models.governance import (
    GovernanceKpi,
    GovernancePolicy,
    KpiMeasurement,
    PolicyActivityLog,
    PolicyControlMapping,
    PolicyFrameworkMapping,
    PolicyVersion,
)
from app.models.user import User
from app.schemas.governance import (
    KpiCreate,
    KpiMeasurementCreate,
    KpiMeasurementOut,
    KpiOut,
    KpiUpdate,
    PolicyActionRequest,
    PolicyCreate,
    PolicyOut,
    PolicyUpdate,
)
from app.services.audit import write_audit
from app.services.kpi_status import calculate_kpi_status, validate_kpi_thresholds

router = APIRouter(prefix="/governance", tags=["governance"])


def _policy_out(row: GovernancePolicy) -> PolicyOut:
    return PolicyOut(
        id=row.id,
        policy_id=row.policy_id,
        name=row.name,
        description=row.description,
        category=row.category,
        department=row.department,
        owner=row.owner,
        approver=row.approver,
        current_version=row.current_version,
        effective_date=row.effective_date,
        next_review_date=row.next_review_date,
        review_frequency=row.review_frequency,
        approval_status=row.approval_status,
        policy_status=row.policy_status,
        notes=row.notes,
        document_filename=row.document_filename,
        frameworks=[m.framework for m in row.framework_mappings],
        controls=[m.control_id for m in row.control_mappings],
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _log_policy(db: Session, policy: GovernancePolicy, actor: str, action: str, detail: str | None = None) -> None:
    db.add(
        PolicyActivityLog(
            policy_id=policy.id,
            actor=actor,
            action=action,
            detail=detail,
        )
    )


# ── Policies ───────────────────────────────────────────────────────────────


@router.get("/policies", response_model=list[PolicyOut])
def list_policies(
    department: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("governance:read")),
) -> list[PolicyOut]:
    q = db.query(GovernancePolicy)
    if department:
        q = q.filter(GovernancePolicy.department == department)
    if status_filter:
        q = q.filter(GovernancePolicy.policy_status == status_filter)
    rows = q.order_by(GovernancePolicy.updated_at.desc()).limit(500).all()
    return [_policy_out(r) for r in rows]


@router.post("/policies", response_model=PolicyOut, status_code=status.HTTP_201_CREATED)
def create_policy(
    body: PolicyCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permissions("governance:policies:create")),
) -> PolicyOut:
    if db.query(GovernancePolicy).filter(GovernancePolicy.policy_id == body.policy_id).first():
        raise HTTPException(status_code=409, detail="Duplicate Policy ID")
    row = GovernancePolicy(
        policy_id=body.policy_id,
        name=body.name,
        description=body.description,
        category=body.category,
        department=body.department,
        owner=body.owner,
        approver=body.approver,
        current_version=body.current_version,
        effective_date=body.effective_date,
        next_review_date=body.next_review_date,
        review_frequency=body.review_frequency,
        approval_status=body.approval_status,
        policy_status=body.policy_status,
        notes=body.notes,
        created_by=user.id,
        updated_by=user.id,
    )
    db.add(row)
    db.flush()
    for fw in body.frameworks:
        db.add(PolicyFrameworkMapping(policy_id=row.id, framework=fw.strip()))
    for ctrl in body.controls:
        db.add(PolicyControlMapping(policy_id=row.id, control_id=ctrl.strip()))
    db.add(
        PolicyVersion(
            policy_id=row.id,
            version=body.current_version,
            change_summary="Initial version",
            changed_by=user.full_name,
            approval_status=body.approval_status,
            is_current=True,
        )
    )
    _log_policy(db, row, user.full_name, "Created")
    db.commit()
    db.refresh(row)
    write_audit(
        db,
        action="governance.policy.created",
        actor_id=user.id,
        actor_name=user.full_name,
        resource_type="governance_policy",
        resource_id=row.policy_id,
    )
    return _policy_out(row)


@router.get("/policies/{policy_id}", response_model=PolicyOut)
def get_policy(
    policy_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("governance:read")),
) -> PolicyOut:
    row = db.query(GovernancePolicy).filter(GovernancePolicy.policy_id == policy_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Policy not found")
    return _policy_out(row)


@router.patch("/policies/{policy_id}", response_model=PolicyOut)
def update_policy(
    policy_id: str,
    body: PolicyUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permissions("governance:policies:update")),
) -> PolicyOut:
    row = db.query(GovernancePolicy).filter(GovernancePolicy.policy_id == policy_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Policy not found")
    data = body.model_dump(exclude_unset=True)
    frameworks = data.pop("frameworks", None)
    controls = data.pop("controls", None)
    for key, value in data.items():
        setattr(row, key, value)
    row.updated_by = user.id
    if frameworks is not None:
        row.framework_mappings.clear()
        for fw in frameworks:
            db.add(PolicyFrameworkMapping(policy_id=row.id, framework=fw.strip()))
    if controls is not None:
        row.control_mappings.clear()
        for ctrl in controls:
            db.add(PolicyControlMapping(policy_id=row.id, control_id=ctrl.strip()))
    _log_policy(db, row, user.full_name, "Edited")
    write_audit(
        db,
        action="governance.policy.edited",
        actor_id=user.id,
        actor_name=user.full_name,
        resource_type="governance_policy",
        resource_id=row.policy_id,
    )
    db.commit()
    db.refresh(row)
    return _policy_out(row)


def _workflow(
    db: Session,
    user: User,
    policy_id: str,
    *,
    action: str,
    policy_status: str,
    approval_status: str,
    allow_self: bool = False,
) -> PolicyOut:
    row = db.query(GovernancePolicy).filter(GovernancePolicy.policy_id == policy_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Policy not found")
    role_names = {r.name for r in user.roles}
    if (
        not allow_self
        and action in {"Approved", "Rejected"}
        and row.owner == user.full_name
        and not user.is_manager
        and "Admin" not in role_names
    ):
        raise HTTPException(
            status_code=403,
            detail="Cannot approve or reject your own policy",
        )
    row.policy_status = policy_status
    row.approval_status = approval_status
    row.updated_by = user.id
    _log_policy(db, row, user.full_name, action)
    write_audit(
        db,
        action=f"governance.policy.{action.lower().replace(' ', '_')}",
        actor_id=user.id,
        actor_name=user.full_name,
        resource_type="governance_policy",
        resource_id=row.policy_id,
    )
    db.commit()
    db.refresh(row)
    return _policy_out(row)


@router.post("/policies/{policy_id}/submit", response_model=PolicyOut)
def submit_policy(
    policy_id: str,
    body: PolicyActionRequest | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permissions("governance:policies:submit")),
) -> PolicyOut:
    _ = body
    return _workflow(
        db,
        user,
        policy_id,
        action="Submitted",
        policy_status="Pending Approval",
        approval_status="Pending",
        allow_self=True,
    )


@router.post("/policies/{policy_id}/approve", response_model=PolicyOut)
def approve_policy(
    policy_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_permissions("governance:policies:approve")),
) -> PolicyOut:
    return _workflow(
        db,
        user,
        policy_id,
        action="Approved",
        policy_status="Approved",
        approval_status="Approved",
    )


@router.post("/policies/{policy_id}/reject", response_model=PolicyOut)
def reject_policy(
    policy_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_permissions("governance:policies:approve")),
) -> PolicyOut:
    return _workflow(
        db,
        user,
        policy_id,
        action="Rejected",
        policy_status="Draft",
        approval_status="Rejected",
    )


@router.post("/policies/{policy_id}/publish", response_model=PolicyOut)
def publish_policy(
    policy_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_permissions("governance:policies:publish")),
) -> PolicyOut:
    return _workflow(
        db,
        user,
        policy_id,
        action="Published",
        policy_status="Published",
        approval_status="Approved",
        allow_self=True,
    )


@router.post("/policies/{policy_id}/archive", response_model=PolicyOut)
def archive_policy(
    policy_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_permissions("governance:policies:archive")),
) -> PolicyOut:
    return _workflow(
        db,
        user,
        policy_id,
        action="Archived",
        policy_status="Archived",
        approval_status="Approved",
        allow_self=True,
    )


# ── KPIs ────────────────────────────────────────────────────────────────────


@router.get("/kpis", response_model=list[KpiOut])
def list_kpis(
    department: str | None = None,
    category: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("governance:read")),
) -> list[GovernanceKpi]:
    q = db.query(GovernanceKpi).filter(GovernanceKpi.is_active.is_(True))
    if department:
        q = q.filter(GovernanceKpi.department == department)
    if category:
        q = q.filter(GovernanceKpi.category == category)
    return q.order_by(GovernanceKpi.updated_at.desc()).limit(500).all()


@router.post("/kpis", response_model=KpiOut, status_code=status.HTTP_201_CREATED)
def create_kpi(
    body: KpiCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permissions("governance:kpis:create")),
) -> GovernanceKpi:
    if db.query(GovernanceKpi).filter(GovernanceKpi.kpi_id == body.kpi_id).first():
        raise HTTPException(status_code=409, detail="Duplicate KPI ID")
    err = validate_kpi_thresholds(
        body.performance_direction,
        body.target,
        body.warning_threshold,
        body.critical_threshold,
        body.target_min,
        body.target_max,
    )
    if err:
        raise HTTPException(status_code=422, detail=err)
    row = GovernanceKpi(
        kpi_id=body.kpi_id,
        name=body.name,
        description=body.description,
        category=body.category,
        department=body.department,
        owner=body.owner,
        frequency=body.frequency,
        unit=body.unit,
        formula=body.formula,
        performance_direction=body.performance_direction,
        target=body.target,
        warning_threshold=body.warning_threshold,
        critical_threshold=body.critical_threshold,
        target_min=body.target_min,
        target_max=body.target_max,
        data_source=body.data_source,
        notes=body.notes,
        created_by=user.id,
        updated_by=user.id,
    )
    db.add(row)
    write_audit(
        db,
        action="governance.kpi.created",
        actor_id=user.id,
        actor_name=user.full_name,
        resource_type="governance_kpi",
        resource_id=row.kpi_id,
    )
    db.commit()
    db.refresh(row)
    return row


@router.get("/kpis/{kpi_id}", response_model=KpiOut)
def get_kpi(
    kpi_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("governance:read")),
) -> GovernanceKpi:
    row = db.query(GovernanceKpi).filter(GovernanceKpi.kpi_id == kpi_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="KPI not found")
    return row


@router.patch("/kpis/{kpi_id}", response_model=KpiOut)
def update_kpi(
    kpi_id: str,
    body: KpiUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permissions("governance:kpis:update")),
) -> GovernanceKpi:
    row = db.query(GovernanceKpi).filter(GovernanceKpi.kpi_id == kpi_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="KPI not found")
    data = body.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(row, key, value)
    err = validate_kpi_thresholds(
        row.performance_direction,
        row.target,
        row.warning_threshold,
        row.critical_threshold,
        row.target_min,
        row.target_max,
    )
    if err:
        raise HTTPException(status_code=422, detail=err)
    row.updated_by = user.id
    write_audit(
        db,
        action="governance.kpi.edited",
        actor_id=user.id,
        actor_name=user.full_name,
        resource_type="governance_kpi",
        resource_id=row.kpi_id,
    )
    db.commit()
    db.refresh(row)
    return row


@router.post(
    "/kpis/{kpi_id}/measurements",
    response_model=KpiMeasurementOut,
    status_code=status.HTTP_201_CREATED,
)
def add_measurement(
    kpi_id: str,
    body: KpiMeasurementCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_permissions("governance:kpis:measure")),
) -> KpiMeasurement:
    row = db.query(GovernanceKpi).filter(GovernanceKpi.kpi_id == kpi_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="KPI not found")
    status_label = calculate_kpi_status(
        body.value,
        row.target,
        row.warning_threshold,
        row.critical_threshold,
        row.performance_direction,
        row.target_min,
        row.target_max,
    )
    measurement = KpiMeasurement(
        kpi_id=row.id,
        period_start=body.period_start,
        period_end=body.period_end,
        value=body.value,
        calculated_status=status_label,
        notes=body.notes,
        recorded_by=user.full_name,
        recorded_at=datetime.utcnow(),
    )
    db.add(measurement)
    row.updated_by = user.id
    write_audit(
        db,
        action="governance.kpi.measurement_added",
        actor_id=user.id,
        actor_name=user.full_name,
        resource_type="governance_kpi",
        resource_id=row.kpi_id,
    )
    db.commit()
    db.refresh(measurement)
    return measurement


@router.get("/kpis/{kpi_id}/measurements", response_model=list[KpiMeasurementOut])
def list_measurements(
    kpi_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("governance:read")),
) -> list[KpiMeasurement]:
    row = db.query(GovernanceKpi).filter(GovernanceKpi.kpi_id == kpi_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="KPI not found")
    return (
        db.query(KpiMeasurement)
        .filter(KpiMeasurement.kpi_id == row.id)
        .order_by(KpiMeasurement.recorded_at.desc())
        .limit(200)
        .all()
    )
