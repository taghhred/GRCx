"""Dashboard aggregation API — executive KPIs and analytics from live DB data."""

from __future__ import annotations

from collections import Counter
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_permissions
from app.models.risk import RiskRecord
from app.models.user import User
from app.services.operational_seed import (
    MODULE_ASSET,
    MODULE_BCM,
    MODULE_DR_SYSTEM,
    MODULE_ORG,
    MODULE_RESP,
    list_payloads,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _level(r: RiskRecord) -> str:
    return (r.residual_level or r.inherent_level or "Medium").title()


def build_dashboard_analytics(
    db: Session,
    *,
    start: str | None = None,
    end: str | None = None,
) -> dict:
    risks = (
        db.query(RiskRecord)
        .filter(RiskRecord.is_archived.is_(False))
        .order_by(RiskRecord.updated_at.desc())
        .limit(2000)
        .all()
    )
    open_statuses = {"Open", "In Progress", "Monitoring", "Identified"}
    open_risks = [r for r in risks if (r.status or "") in open_statuses or r.status == "Open"]
    critical = [r for r in risks if _level(r) == "Critical"]

    by_level = Counter(_level(r) for r in risks)
    by_department = Counter((r.department or "Unassigned") for r in risks)
    by_framework = Counter((r.framework or "Unmapped") for r in risks)
    by_bu = Counter((r.business_unit or "Unassigned") for r in risks)
    by_treatment = Counter((r.treatment or "Untreated") for r in risks)
    by_category = Counter((r.category or "General") for r in risks)
    open_vs_closed = {
        "Open": len(open_risks),
        "Closed": len(
            [
                r
                for r in risks
                if (r.status or "").lower() in ("closed", "accepted", "mitigated")
            ]
        ),
    }

    monthly: Counter[str] = Counter()
    for r in risks:
        ts = r.updated_at or r.created_at
        if ts:
            monthly[ts.strftime("%Y-%m")] += 1
    monthly_trend = [{"month": k, "count": v} for k, v in sorted(monthly.items())[-12:]]

    assets = [a for a in list_payloads(db, MODULE_ASSET) if a.get("id")]
    compliant = sum(1 for a in assets if a.get("complianceStatus") == "Compliant")
    compliance_score = round((compliant / len(assets)) * 100, 1) if assets else 0.0
    compliance_trend = [
        {"month": m["month"], "count": compliance_score} for m in monthly_trend[-6:]
    ] or [{"month": datetime.utcnow().strftime("%Y-%m"), "count": compliance_score}]

    bcm = list_payloads(db, MODULE_BCM)
    bcm_ready = sum(
        1 for p in bcm if str(p.get("status", "")).lower() in ("ready", "active", "tested")
    )
    bcm_pct = round((bcm_ready / len(bcm)) * 100, 1) if bcm else 0.0

    dr_systems = list_payloads(db, MODULE_DR_SYSTEM)
    dr_ready = sum(
        1
        for s in dr_systems
        if str(s.get("recoveryStatus", "")).lower() in ("operational", "ready", "recovered")
    )
    dr_pct = round((dr_ready / len(dr_systems)) * 100, 1) if dr_systems else 0.0

    risk_rows = [
        {
            "riskId": r.risk_id,
            "title": r.title,
            "level": _level(r),
            "owner": r.owner,
            "businessUnit": r.business_unit,
            "department": r.department,
            "category": r.category,
            "status": r.status,
            "treatment": r.treatment,
            "nextReviewDate": r.next_review_date.isoformat() if r.next_review_date else None,
            "lastUpdated": r.updated_at.isoformat() if r.updated_at else None,
            "residualScore": r.residual_score,
        }
        for r in risks[:50]
    ]

    return {
        "risks": risk_rows,
        "openRisks": len(open_risks),
        "criticalRisks": len(critical),
        "overdueAssessments": 0,
        "treatmentProgress": round(
            (len([r for r in risks if r.treatment]) / len(risks)) * 100, 1
        )
        if risks
        else 0,
        "byLevel": [{"name": k, "value": v} for k, v in by_level.items()],
        "byDepartment": [{"name": k, "value": v} for k, v in by_department.items()],
        "byFramework": [{"name": k, "value": v} for k, v in by_framework.items()],
        "byBusinessUnit": [{"name": k, "value": v} for k, v in by_bu.items()],
        "byTreatment": [{"name": k, "value": v} for k, v in by_treatment.items()],
        "byCategory": [{"name": k, "value": v} for k, v in by_category.items()],
        "openVsClosed": [{"name": k, "value": v} for k, v in open_vs_closed.items()],
        "monthlyTrend": monthly_trend,
        "residualDistribution": [{"name": k, "value": v} for k, v in by_level.items()],
        "complianceTrend": compliance_trend,
        "heatmap": [],
        "topCritical": risk_rows[:5],
        "recentlyUpdated": risk_rows[:8],
        "upcomingReviews": [],
        "highRiskBusinessUnits": [{"name": k, "value": v} for k, v in by_bu.most_common(5)],
        "mostCommonCategories": [
            {"name": k, "value": v} for k, v in by_category.most_common(5)
        ],
        "meta": {
            "overallCompliance": compliance_score,
            "bcmReadiness": bcm_pct,
            "drReadiness": dr_pct,
            "frameworkCoverage": len(by_framework),
            "rangeStart": start,
            "rangeEnd": end,
        },
    }


@router.get("/analytics")
def dashboard_analytics(
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("risk:read")),
    start: str | None = Query(None),
    end: str | None = Query(None),
) -> dict:
    return build_dashboard_analytics(db, start=start, end=end)


@router.get("/kpis")
def dashboard_kpis(
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("risk:read")),
) -> list[dict]:
    data = build_dashboard_analytics(db)
    meta = data.get("meta") or {}
    return [
        {
            "id": "overall-compliance",
            "title": "Overall Compliance",
            "value": f"{meta.get('overallCompliance', 0)}%",
            "trendDirection": "up",
            "trendLabel": "vs prior period",
            "comparisonLabel": "Framework adherence",
            "status": "on-track",
            "href": "/compliance",
        },
        {
            "id": "open-risks",
            "title": "Open Risks",
            "value": str(data.get("openRisks", 0)),
            "trendDirection": "flat",
            "trendLabel": "active register",
            "comparisonLabel": "Risk Assessment",
            "status": "watch",
            "href": "/risk/register",
        },
        {
            "id": "critical-risks",
            "title": "Critical Risks",
            "value": str(data.get("criticalRisks", 0)),
            "trendDirection": "down",
            "trendLabel": "priority focus",
            "comparisonLabel": "Critical residual",
            "status": "at-risk" if data.get("criticalRisks", 0) else "on-track",
            "href": "/risk/register",
        },
        {
            "id": "bcm-readiness",
            "title": "Business Continuity Readiness",
            "value": f"{meta.get('bcmReadiness', 0)}%",
            "trendDirection": "up",
            "trendLabel": "process readiness",
            "comparisonLabel": "BCM",
            "status": "on-track",
            "href": "/bcm",
        },
        {
            "id": "dr-readiness",
            "title": "Disaster Recovery Readiness",
            "value": f"{meta.get('drReadiness', 0)}%",
            "trendDirection": "up",
            "trendLabel": "system recovery",
            "comparisonLabel": "DR",
            "status": "on-track",
            "href": "/drp",
        },
        {
            "id": "framework-coverage",
            "title": "Framework Coverage",
            "value": str(meta.get("frameworkCoverage", 0)),
            "trendDirection": "flat",
            "trendLabel": "mapped frameworks",
            "comparisonLabel": "Controls",
            "status": "on-track",
            "href": "/governance",
        },
    ]


@router.get("/organization")
def dashboard_organization(
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("risk:read")),
) -> dict:
    trees = list_payloads(db, MODULE_ORG)
    resps = list_payloads(db, MODULE_RESP)
    return {
        "orgTree": trees[0] if trees else {},
        "responsibilities": resps,
    }
