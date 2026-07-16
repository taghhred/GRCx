"""Tests for Governance policies and KPIs."""

from app.services.kpi_status import calculate_kpi_status, validate_kpi_thresholds


def test_kpi_status_higher_is_better():
    assert (
        calculate_kpi_status(95, 95, 90, 80, "Higher Is Better") == "On Target"
    )
    assert calculate_kpi_status(93, 95, 90, 80, "Higher Is Better") == "Warning"
    assert calculate_kpi_status(70, 95, 90, 80, "Higher Is Better") == "Critical"
    assert calculate_kpi_status(None, 95, 90, 80, "Higher Is Better") == "No Data"


def test_kpi_status_lower_is_better():
    assert calculate_kpi_status(8, 10, 14, 21, "Lower Is Better") == "On Target"
    assert calculate_kpi_status(12, 10, 14, 21, "Lower Is Better") == "Warning"
    assert calculate_kpi_status(25, 10, 14, 21, "Lower Is Better") == "Critical"


def test_kpi_status_target_range():
    assert (
        calculate_kpi_status(50, 50, 40, 20, "Target Range", 40, 60)
        == "On Target"
    )


def test_threshold_validation():
    assert validate_kpi_thresholds("Higher Is Better", 95, 90, 80) is None
    assert validate_kpi_thresholds("Higher Is Better", 80, 90, 95) is not None
    assert validate_kpi_thresholds("Lower Is Better", 10, 14, 21) is None


def test_governance_policy_crud(client):
    client.post(
        "/api/v1/auth/login",
        json={"email": "test@grcx.local", "password": "123456"},
    )

    created = client.post(
        "/api/v1/governance/policies",
        json={
            "policy_id": "POL-API-001",
            "name": "API Test Policy",
            "description": "Created by pytest",
            "category": "Information Security",
            "department": "Cybersecurity GRC",
            "owner": "Mohammed",
            "approver": "Sara",
            "frameworks": ["ISO 27001"],
            "controls": ["A.5.1"],
        },
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["policy_id"] == "POL-API-001"
    assert body["frameworks"] == ["ISO 27001"]

    listed = client.get("/api/v1/governance/policies")
    assert listed.status_code == 200
    assert any(p["policy_id"] == "POL-API-001" for p in listed.json())

    submitted = client.post("/api/v1/governance/policies/POL-API-001/submit")
    assert submitted.status_code == 200
    assert submitted.json()["policy_status"] == "Pending Approval"

    # Specialist cannot approve own policy without manager/admin
    approved = client.post("/api/v1/governance/policies/POL-API-001/approve")
    assert approved.status_code == 403


def test_governance_kpi_crud(client):
    client.post(
        "/api/v1/auth/login",
        json={"email": "test@grcx.local", "password": "123456"},
    )

    created = client.post(
        "/api/v1/governance/kpis",
        json={
            "kpi_id": "KPI-API-001",
            "name": "Policy Compliance %",
            "category": "Governance",
            "department": "Cybersecurity GRC",
            "owner": "Mohammed",
            "frequency": "Monthly",
            "unit": "Percentage",
            "formula": "(Compliant Policies ÷ Total Policies) × 100",
            "performance_direction": "Higher Is Better",
            "target": 95,
            "warning_threshold": 90,
            "critical_threshold": 80,
        },
    )
    assert created.status_code == 201, created.text

    measured = client.post(
        "/api/v1/governance/kpis/KPI-API-001/measurements",
        json={
            "period_start": "2026-07-01",
            "period_end": "2026-07-31",
            "value": 93,
            "notes": "Pending policy review",
        },
    )
    assert measured.status_code == 201, measured.text
    assert measured.json()["calculated_status"] == "Warning"

    history = client.get("/api/v1/governance/kpis/KPI-API-001/measurements")
    assert history.status_code == 200
    assert len(history.json()) >= 1


def test_duplicate_kpi_rejected(client):
    client.post(
        "/api/v1/auth/login",
        json={"email": "test@grcx.local", "password": "123456"},
    )
    payload = {
        "kpi_id": "KPI-DUP-001",
        "name": "Dup",
        "category": "Governance",
        "department": "Cybersecurity GRC",
        "owner": "Mohammed",
        "target": 10,
        "warning_threshold": 8,
        "critical_threshold": 5,
        "performance_direction": "Higher Is Better",
    }
    assert client.post("/api/v1/governance/kpis", json=payload).status_code == 201
    again = client.post("/api/v1/governance/kpis", json=payload)
    assert again.status_code == 409
