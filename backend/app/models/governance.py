"""Governance domain models — policies, KPIs, measurements, evidence, audit."""

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


class GovernancePolicy(Base):
    __tablename__ = "governance_policies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    policy_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(120), index=True)
    department: Mapped[str] = mapped_column(String(120), index=True)
    owner: Mapped[str] = mapped_column(String(120), index=True)
    approver: Mapped[str | None] = mapped_column(String(120), nullable=True)
    current_version: Mapped[str] = mapped_column(String(40), default="1.0")
    effective_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    next_review_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    review_frequency: Mapped[str | None] = mapped_column(String(40), nullable=True)
    approval_status: Mapped[str] = mapped_column(String(40), default="Not Submitted", index=True)
    policy_status: Mapped[str] = mapped_column(String(40), default="Draft", index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    document_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    document_storage_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    updated_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    versions: Mapped[list[PolicyVersion]] = relationship(back_populates="policy", cascade="all, delete-orphan")
    evidence: Mapped[list[PolicyEvidence]] = relationship(back_populates="policy", cascade="all, delete-orphan")
    activity_logs: Mapped[list[PolicyActivityLog]] = relationship(
        back_populates="policy", cascade="all, delete-orphan"
    )
    framework_mappings: Mapped[list[PolicyFrameworkMapping]] = relationship(
        back_populates="policy", cascade="all, delete-orphan"
    )
    control_mappings: Mapped[list[PolicyControlMapping]] = relationship(
        back_populates="policy", cascade="all, delete-orphan"
    )


class PolicyVersion(Base):
    __tablename__ = "policy_versions"
    __table_args__ = (UniqueConstraint("policy_id", "version", name="uq_policy_version"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    policy_id: Mapped[str] = mapped_column(ForeignKey("governance_policies.id"), index=True)
    version: Mapped[str] = mapped_column(String(40))
    change_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    changed_by: Mapped[str | None] = mapped_column(String(120), nullable=True)
    change_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    approval_status: Mapped[str | None] = mapped_column(String(40), nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)
    document_storage_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    document_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)

    policy: Mapped[GovernancePolicy] = relationship(back_populates="versions")


class PolicyFrameworkMapping(Base):
    __tablename__ = "policy_framework_mappings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    policy_id: Mapped[str] = mapped_column(ForeignKey("governance_policies.id"), index=True)
    framework: Mapped[str] = mapped_column(String(120))

    policy: Mapped[GovernancePolicy] = relationship(back_populates="framework_mappings")


class PolicyControlMapping(Base):
    __tablename__ = "policy_control_mappings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    policy_id: Mapped[str] = mapped_column(ForeignKey("governance_policies.id"), index=True)
    control_id: Mapped[str] = mapped_column(String(80))

    policy: Mapped[GovernancePolicy] = relationship(back_populates="control_mappings")


class PolicyEvidence(Base):
    __tablename__ = "policy_evidence"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    policy_id: Mapped[str] = mapped_column(ForeignKey("governance_policies.id"), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    file_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    storage_key: Mapped[str] = mapped_column(String(512))
    uploaded_by: Mapped[str | None] = mapped_column(String(120), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    policy: Mapped[GovernancePolicy] = relationship(back_populates="evidence")


class PolicyActivityLog(Base):
    __tablename__ = "policy_activity_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    policy_id: Mapped[str] = mapped_column(ForeignKey("governance_policies.id"), index=True)
    actor: Mapped[str | None] = mapped_column(String(120), nullable=True)
    action: Mapped[str] = mapped_column(String(80))
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    policy: Mapped[GovernancePolicy] = relationship(back_populates="activity_logs")


class GovernanceKpi(Base):
    __tablename__ = "governance_kpis"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    kpi_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(120), index=True)
    department: Mapped[str] = mapped_column(String(120), index=True)
    owner: Mapped[str] = mapped_column(String(120), index=True)
    frequency: Mapped[str] = mapped_column(String(40), default="Monthly")
    unit: Mapped[str] = mapped_column(String(40), default="Percentage")
    formula: Mapped[str | None] = mapped_column(Text, nullable=True)
    performance_direction: Mapped[str] = mapped_column(String(40), default="Higher Is Better")
    target: Mapped[float] = mapped_column(Float, default=0)
    warning_threshold: Mapped[float] = mapped_column(Float, default=0)
    critical_threshold: Mapped[float] = mapped_column(Float, default=0)
    target_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    target_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    data_source: Mapped[str | None] = mapped_column(String(80), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    updated_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    measurements: Mapped[list[KpiMeasurement]] = relationship(
        back_populates="kpi", cascade="all, delete-orphan"
    )
    evidence: Mapped[list[KpiEvidence]] = relationship(back_populates="kpi", cascade="all, delete-orphan")


class KpiMeasurement(Base):
    __tablename__ = "kpi_measurements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    kpi_id: Mapped[str] = mapped_column(ForeignKey("governance_kpis.id"), index=True)
    period_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    period_end: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    value: Mapped[float | None] = mapped_column(Float, nullable=True)
    calculated_status: Mapped[str | None] = mapped_column(String(40), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    recorded_by: Mapped[str | None] = mapped_column(String(120), nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    kpi: Mapped[GovernanceKpi] = relationship(back_populates="measurements")


class KpiEvidence(Base):
    __tablename__ = "kpi_evidence"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    kpi_id: Mapped[str] = mapped_column(ForeignKey("governance_kpis.id"), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    file_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    storage_key: Mapped[str] = mapped_column(String(512))
    uploaded_by: Mapped[str | None] = mapped_column(String(120), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    kpi: Mapped[GovernanceKpi] = relationship(back_populates="evidence")


class KpiImportJob(Base):
    __tablename__ = "kpi_import_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    filename: Mapped[str] = mapped_column(String(255))
    mode: Mapped[str] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(40), default="pending")
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    summary_json: Mapped[str | None] = mapped_column(Text, nullable=True)


class KpiImportError(Base):
    __tablename__ = "kpi_import_errors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    job_id: Mapped[str] = mapped_column(ForeignKey("kpi_import_jobs.id"), index=True)
    row_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    message: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
