"""Risk Assessment Excel import tests."""

from pathlib import Path

from app.services.risk_excel import parse_risk_register_path
from app.services.risk_register import ensure_risks_seeded, sync_seed_folder
from app.models.risk import RiskRecord


DATA = Path(__file__).resolve().parents[1] / "data" / "RiskAssessment"


def test_parse_ibm_risk_register():
    path = DATA / "IBM_Synthetic_Risk_Assessment_Standardized.xlsx"
    result = parse_risk_register_path(path)
    assert len(result.rows) >= 10
    assert result.rows[0].risk_id.startswith("RISK-IBM-")
    assert result.errors == []


def test_seed_folder_imports_all_vendors(client):
    from app.db import session as session_mod

    db = session_mod.SessionLocal()
    try:
        sync_seed_folder(db)
        ensure_risks_seeded(db)
        count = db.query(RiskRecord).count()
        assert count >= 30
    finally:
        db.close()

    client.post(
        "/api/v1/auth/login",
        json={"email": "test@grcx.local", "password": "123456"},
    )
    listed = client.get("/api/v1/risks")
    assert listed.status_code == 200
    body = listed.json()
    assert len(body) >= 30
    assert any(r["riskId"].startswith("RISK-IBM-") for r in body)
    assert any(r["riskId"].startswith("RISK-MST-") for r in body)
    assert any(r["riskId"].startswith("RISK-SPL-") for r in body)

    stats = client.get("/api/v1/risks/stats")
    assert stats.status_code == 200
    assert stats.json()["total"] >= 30
