import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SoarCase(Base):
    """SOAR-ingested GRC case (queue entity). JSON details in payload for Phase 1."""

    __tablename__ = "soar_cases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    source: Mapped[str] = mapped_column(String(40), default="SOAR")
    severity: Mapped[str] = mapped_column(String(40), index=True)
    status: Mapped[str] = mapped_column(String(40), index=True)
    control: Mapped[str | None] = mapped_column(String(120), nullable=True)
    framework: Mapped[str | None] = mapped_column(String(80), nullable=True)
    affected_asset: Mapped[str | None] = mapped_column(String(120), nullable=True)
    department: Mapped[str | None] = mapped_column(String(120), nullable=True)
    assigned_to: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    owner: Mapped[str | None] = mapped_column(String(120), nullable=True)
    specialization: Mapped[str | None] = mapped_column(String(40), nullable=True)
    sla_state: Mapped[str | None] = mapped_column(String(40), nullable=True)
    archived: Mapped[bool] = mapped_column(Boolean, default=False)
    payload_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )
