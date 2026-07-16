from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.notification import Notification
from app.models.user import User

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    rows = (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.dismissed.is_(False))
        .order_by(Notification.created_at.desc())
        .limit(100)
        .all()
    )
    return [
        {
            "id": r.id,
            "title": r.title,
            "body": r.body,
            "caseId": r.case_id,
            "read": r.read,
            "createdAt": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]
