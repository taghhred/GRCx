"""Operational module documents — JSON payload rows matching frontend shapes."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class OperationalDocument(Base):
    """Generic persisted document for Identity / Asset Compliance / BCM / DR / org."""

    __tablename__ = "operational_documents"
    __table_args__ = (
        UniqueConstraint("module", "business_key", name="uq_operational_module_key"),
        Index("ix_operational_module", "module"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    module: Mapped[str] = mapped_column(String(40), index=True)
    business_key: Mapped[str] = mapped_column(String(120), index=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    department: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    status: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    payload_json: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )
    is_archived: Mapped[int] = mapped_column(Integer, default=0)


class ComplianceRegisterItem(Base):
    __tablename__ = "compliance_register_items"
    __table_args__ = (
        UniqueConstraint("item_id", name="uq_compliance_register_item_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    item_id: Mapped[str] = mapped_column(String(120), index=True)
    payload_json: Mapped[str] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )


class ComplianceAssessmentItem(Base):
    __tablename__ = "compliance_assessment_items"
    __table_args__ = (
        UniqueConstraint("item_id", name="uq_compliance_assessment_item_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    item_id: Mapped[str] = mapped_column(String(120), index=True)
    payload_json: Mapped[str] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )


class ComplianceEvidenceItem(Base):
    __tablename__ = "compliance_evidence_items"
    __table_args__ = (
        UniqueConstraint("item_id", name="uq_compliance_evidence_item_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    item_id: Mapped[str] = mapped_column(String(120), index=True)
    payload_json: Mapped[str] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )


class ReportRecord(Base):
    __tablename__ = "report_records"
    __table_args__ = (UniqueConstraint("report_id", name="uq_report_records_report_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    report_id: Mapped[str] = mapped_column(String(64), index=True)
    name: Mapped[str] = mapped_column(String(255))
    category: Mapped[str | None] = mapped_column(String(80), nullable=True)
    report_type: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(40), default="Ready", index=True)
    issue_date: Mapped[str | None] = mapped_column(String(40), nullable=True)
    generated_time: Mapped[str | None] = mapped_column(String(40), nullable=True)
    generated_by: Mapped[str | None] = mapped_column(String(120), nullable=True)
    department: Mapped[str | None] = mapped_column(String(120), nullable=True)
    classification: Mapped[str | None] = mapped_column(String(80), nullable=True)
    pages: Mapped[int] = mapped_column(Integer, default=0)
    pdf_storage_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    payload_json: Mapped[str] = mapped_column(Text)
    is_archived: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )


class ReportSchedule(Base):
    __tablename__ = "report_schedules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    schedule_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    payload_json: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )


class AccessTokenDenylist(Base):
    """Short-lived denylist of access JWT JTIs revoked on logout."""

    __tablename__ = "access_token_denylist"

    jti: Mapped[str] = mapped_column(String(64), primary_key=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
