"""Import all models so Alembic / create_all see metadata."""

from app.db.base import Base
from app.models.user import Permission, Role, User, user_roles  # noqa: F401
from app.models.audit import AuditEvent  # noqa: F401
from app.models.notification import Notification  # noqa: F401
from app.models.soar_case import SoarCase  # noqa: F401
from app.models.session import AuthSession  # noqa: F401
from app.models.governance import (  # noqa: F401
    GovernancePolicy,
    GovernanceKpi,
)

__all__ = ["Base"]
