"""Risk Assessment API schemas."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field


class RiskCreate(BaseModel):
    risk_id: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=1, max_length=255)
    category: str = "General"
    affected_asset: str | None = None
    business_unit: str | None = None
    department: str | None = None
    vendor: str | None = None
    owner: str = "Unassigned"
    description: str | None = None
    inherent_likelihood: float | None = None
    inherent_impact: float | None = None
    inherent_score: float | None = None
    inherent_level: str | None = None
    treatment: str | None = "Mitigate"
    planned_controls: str | None = None
    framework: str | None = None
    framework_control_ref: str | None = None
    residual_likelihood: float | None = None
    residual_impact: float | None = None
    residual_score: float | None = None
    residual_level: str | None = None
    status: str = "Open"
    date_identified: date | None = None
    next_review_date: date | None = None
    notes: str | None = None


class RiskUpdate(BaseModel):
    title: str | None = None
    category: str | None = None
    affected_asset: str | None = None
    business_unit: str | None = None
    department: str | None = None
    vendor: str | None = None
    owner: str | None = None
    description: str | None = None
    inherent_likelihood: float | None = None
    inherent_impact: float | None = None
    inherent_score: float | None = None
    inherent_level: str | None = None
    treatment: str | None = None
    planned_controls: str | None = None
    framework: str | None = None
    framework_control_ref: str | None = None
    residual_likelihood: float | None = None
    residual_impact: float | None = None
    residual_score: float | None = None
    residual_level: str | None = None
    status: str | None = None
    date_identified: date | None = None
    next_review_date: date | None = None
    notes: str | None = None


class RiskOut(BaseModel):
    id: str
    riskId: str
    title: str
    category: str
    affectedAsset: str
    businessUnit: str
    department: str
    vendor: str
    owner: str
    description: str
    inherentLikelihood: float | None
    inherentImpact: float | None
    inherentScore: float | None
    inherentLevel: str
    treatment: str
    plannedControls: str
    framework: str
    frameworkControlRef: str
    residualLikelihood: float | None
    residualImpact: float | None
    residualScore: float | None
    residualLevel: str
    status: str
    dateIdentified: str
    nextReviewDate: str
    notes: str
    sourceFilename: str
    sourceFileId: str | None
    lastUpdated: str
    createdAt: str
    evidence: list[dict[str, Any]] = Field(default_factory=list)
    history: list[dict[str, Any]] = Field(default_factory=list)


class ImportSummaryOut(BaseModel):
    filename: str
    imported: int
    updated: int
    skipped_duplicates: int
    errors: int
    error_messages: list[str] = Field(default_factory=list)
    file_id: str | None = None


class RiskStatsOut(BaseModel):
    total: int
    critical: int
    high: int
    medium: int
    low: int
    byDepartment: dict[str, int]
    byVendor: dict[str, int]
    byFramework: dict[str, int]
    byStatus: dict[str, int]
    byLevel: dict[str, int]
