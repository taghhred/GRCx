from sqlalchemy.orm import Session

from app.models.audit import AuditEvent


def write_audit(
    db: Session,
    *,
    action: str,
    actor_id: str | None = None,
    actor_name: str | None = None,
    resource_type: str | None = None,
    resource_id: str | None = None,
    detail: str | None = None,
    ip_address: str | None = None,
) -> AuditEvent:
    event = AuditEvent(
        action=action,
        actor_id=actor_id,
        actor_name=actor_name,
        resource_type=resource_type,
        resource_id=resource_id,
        detail=detail,
        ip_address=ip_address,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event
