"""Normalized Risk Assessment / Risk Register models."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class UploadedRiskFile(Base):
    """Permanent record of an imported Excel workbook."""

    __tablename__ = "uploaded_risk_files"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    filename: Mapped[str] = mapped_column(String(255), index=True)
    original_filename: Mapped[str] = mapped_column(String(255))
    storage_path: Mapped[str] = mapped_column(String(512))
    content_sha256: Mapped[str] = mapped_column(String(64), index=True)
    byte_size: Mapped[int] = mapped_column(Integer, default=0)
    source_vendor: Mapped[str | None] = mapped_column(String(120), nullable=True)
    imported_by: Mapped[str | None] = mapped_column(String(120), nullable=True)
    version: Mapped[str] = mapped_column(String(40), default="1.0")
    imported_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    record_count: Mapped[int] = mapped_column(Integer, default=0)

    risks: Mapped[list[RiskRecord]] = relationship(back_populates="source_file")
    import_logs: Mapped[list[RiskImportLog]] = relationship(
        back_populates="uploaded_file"
    )


class RiskRecord(Base):
    __tablename__ = "risk_records"
    __table_args__ = (UniqueConstraint("risk_id", name="uq_risk_records_risk_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    risk_id: Mapped[str] = mapped_column(String(64), index=True)
    title: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(120), index=True)
    affected_asset: Mapped[str | None] = mapped_column(String(255), nullable=True)
    business_unit: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    department: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    vendor: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    owner: Mapped[str] = mapped_column(String(120), index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    inherent_likelihood: Mapped[float | None] = mapped_column(Float, nullable=True)
    inherent_impact: Mapped[float | None] = mapped_column(Float, nullable=True)
    inherent_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    inherent_level: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    treatment: Mapped[str | None] = mapped_column(String(80), nullable=True)
    planned_controls: Mapped[str | None] = mapped_column(Text, nullable=True)
    framework: Mapped[str | None] = mapped_column(String(160), nullable=True, index=True)
    framework_control_ref: Mapped[str | None] = mapped_column(String(160), nullable=True)
    residual_likelihood: Mapped[float | None] = mapped_column(Float, nullable=True)
    residual_impact: Mapped[float | None] = mapped_column(Float, nullable=True)
    residual_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    residual_level: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(80), default="Open", index=True)
    date_identified: Mapped[date | None] = mapped_column(Date, nullable=True)
    next_review_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_file_id: Mapped[str | None] = mapped_column(
        ForeignKey("uploaded_risk_files.id"), nullable=True, index=True
    )
    source_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    updated_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    source_file: Mapped[UploadedRiskFile | None] = relationship(back_populates="risks")
    evidence: Mapped[list[RiskEvidenceRecord]] = relationship(
        back_populates="risk", cascade="all, delete-orphan"
    )
    history: Mapped[list[RiskHistoryRecord]] = relationship(
        back_populates="risk", cascade="all, delete-orphan"
    )


class RiskEvidenceRecord(Base):
    __tablename__ = "risk_evidence_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    risk_id: Mapped[str] = mapped_column(ForeignKey("risk_records.id"), index=True)
    evidence_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    filename: Mapped[str] = mapped_column(String(255))
    file_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    storage_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    uploaded_by: Mapped[str | None] = mapped_column(String(120), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    risk: Mapped[RiskRecord] = relationship(back_populates="evidence")


class RiskHistoryRecord(Base):
    __tablename__ = "risk_history_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    risk_id: Mapped[str] = mapped_column(ForeignKey("risk_records.id"), index=True)
    actor: Mapped[str | None] = mapped_column(String(120), nullable=True)
    action: Mapped[str] = mapped_column(String(120))
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    risk: Mapped[RiskRecord] = relationship(back_populates="history")


class RiskImportLog(Base):
    __tablename__ = "risk_import_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    uploaded_file_id: Mapped[str | None] = mapped_column(
        ForeignKey("uploaded_risk_files.id"), nullable=True, index=True
    )
    filename: Mapped[str] = mapped_column(String(255))
    imported_by: Mapped[str | None] = mapped_column(String(120), nullable=True)
    imported: Mapped[int] = mapped_column(Integer, default=0)
    updated: Mapped[int] = mapped_column(Integer, default=0)
    skipped_duplicates: Mapped[int] = mapped_column(Integer, default=0)
    errors: Mapped[int] = mapped_column(Integer, default=0)
    summary_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    uploaded_file: Mapped[UploadedRiskFile | None] = relationship(
        back_populates="import_logs"
    )
