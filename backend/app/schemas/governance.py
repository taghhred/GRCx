"""Pydantic schemas for Governance policies and KPIs."""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator


class PolicyCreate(BaseModel):
    policy_id: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    category: str
    department: str
    owner: str
    approver: str | None = None
    current_version: str = "1.0"
    effective_date: date | None = None
    next_review_date: date | None = None
    review_frequency: str | None = "Annual"
    approval_status: str = "Not Submitted"
    policy_status: str = "Draft"
    notes: str | None = None
    frameworks: list[str] = Field(default_factory=list)
    controls: list[str] = Field(default_factory=list)

    @field_validator("policy_id", "name", "owner")
    @classmethod
    def strip_required(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Required field cannot be empty")
        return cleaned


class PolicyUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    category: str | None = None
    department: str | None = None
    owner: str | None = None
    approver: str | None = None
    current_version: str | None = None
    effective_date: date | None = None
    next_review_date: date | None = None
    review_frequency: str | None = None
    approval_status: str | None = None
    policy_status: str | None = None
    notes: str | None = None
    frameworks: list[str] | None = None
    controls: list[str] | None = None


class PolicyOut(BaseModel):
    id: str
    policy_id: str
    name: str
    description: str | None
    category: str
    department: str
    owner: str
    approver: str | None
    current_version: str
    effective_date: date | None
    next_review_date: date | None
    review_frequency: str | None
    approval_status: str
    policy_status: str
    notes: str | None
    document_filename: str | None
    frameworks: list[str] = Field(default_factory=list)
    controls: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PolicyActionRequest(BaseModel):
    comment: str | None = Field(default=None, max_length=1000)


class KpiCreate(BaseModel):
    kpi_id: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    category: str
    department: str
    owner: str
    frequency: str = "Monthly"
    unit: str = "Percentage"
    formula: str | None = None
    performance_direction: str = "Higher Is Better"
    target: float
    warning_threshold: float
    critical_threshold: float
    target_min: float | None = None
    target_max: float | None = None
    data_source: str | None = "Manual Entry"
    notes: str | None = None

    @field_validator("kpi_id", "name", "owner")
    @classmethod
    def strip_required(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Required field cannot be empty")
        return cleaned


class KpiUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    category: str | None = None
    department: str | None = None
    owner: str | None = None
    frequency: str | None = None
    unit: str | None = None
    formula: str | None = None
    performance_direction: str | None = None
    target: float | None = None
    warning_threshold: float | None = None
    critical_threshold: float | None = None
    target_min: float | None = None
    target_max: float | None = None
    data_source: str | None = None
    notes: str | None = None
    is_active: bool | None = None


class KpiOut(BaseModel):
    id: str
    kpi_id: str
    name: str
    description: str | None
    category: str
    department: str
    owner: str
    frequency: str
    unit: str
    formula: str | None
    performance_direction: str
    target: float
    warning_threshold: float
    critical_threshold: float
    target_min: float | None
    target_max: float | None
    data_source: str | None
    is_active: bool
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class KpiMeasurementCreate(BaseModel):
    period_start: date | None = None
    period_end: date | None = None
    value: float | None = None
    notes: str | None = None


class KpiMeasurementOut(BaseModel):
    id: str
    period_start: date | None
    period_end: date | None
    value: float | None
    calculated_status: str | None
    notes: str | None
    recorded_by: str | None
    recorded_at: datetime

    model_config = {"from_attributes": True}
