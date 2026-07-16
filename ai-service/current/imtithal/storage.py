# -*- coding: utf-8 -*-
"""Local SQLite persistence for Imtithal findings + live dashboard stats.

Every analysis (manual / excel / soar) is one row. Dashboard KPIs are computed
from these records — never hardcoded.
"""
from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import CATEGORY_AR, DATA_DIR

DB_PATH = DATA_DIR / "imtithal.db"

_VALID_STATUS = frozenset({"open", "in_progress", "closed"})
_VALID_SOURCE = frozenset({"manual", "excel", "soar"})

_SEVERITY_WEIGHT = {
    "Critical": 10,
    "High": 6,
    "Medium": 3,
    "Low": 1,
}


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _connect() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create the findings table if missing."""
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS findings (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                source TEXT NOT NULL,
                input_text TEXT NOT NULL,
                category TEXT,
                category_ar TEXT,
                confidence REAL,
                severity TEXT,
                department TEXT,
                status TEXT NOT NULL DEFAULT 'open',
                regulations TEXT,
                lang TEXT,
                report_json TEXT
            )
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_findings_status ON findings(status)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_findings_source ON findings(source)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_findings_created ON findings(created_at DESC)"
        )
        conn.commit()


def _extract_reg_ids(report: dict) -> list[str]:
    regs = report.get("regulations") or []
    ids: list[str] = []
    for r in regs:
        if isinstance(r, dict):
            rid = (r.get("id") or "").strip()
            if rid:
                ids.append(rid)
        elif isinstance(r, str) and r.strip():
            ids.append(r.strip())
    return ids


def save_finding(
    report: dict,
    source: str = "manual",
    department: str | None = None,
    status: str = "open",
) -> str:
    """Persist one analysis report. Returns finding id."""
    init_db()
    if source not in _VALID_SOURCE:
        raise ValueError(f"Invalid source: {source}")
    if status not in _VALID_STATUS:
        raise ValueError(f"Invalid status: {status}")

    cls = report.get("classification") or {}
    category = cls.get("category") or ""
    category_ar = cls.get("category_ar") or CATEGORY_AR.get(category, category)
    confidence = float(cls.get("confidence") or 0.0)
    severity = report.get("severity") or "Medium"
    lang = report.get("lang") or "ar"
    input_text = report.get("input") or ""
    reg_ids = _extract_reg_ids(report)
    fid = str(uuid.uuid4())

    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO findings (
                id, created_at, source, input_text, category, category_ar,
                confidence, severity, department, status, regulations, lang, report_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                fid,
                _utc_now(),
                source,
                input_text,
                category,
                category_ar,
                confidence,
                severity,
                (department or "").strip() or "Unassigned",
                status,
                json.dumps(reg_ids, ensure_ascii=False),
                lang,
                json.dumps(report, ensure_ascii=False),
            ),
        )
        conn.commit()
    return fid


def update_status(finding_id: str, status: str) -> bool:
    init_db()
    if status not in _VALID_STATUS:
        raise ValueError(f"Invalid status: {status}")
    with _connect() as conn:
        cur = conn.execute(
            "UPDATE findings SET status = ? WHERE id = ?",
            (status, finding_id),
        )
        conn.commit()
        return cur.rowcount > 0


def list_findings(
    limit: int = 50,
    status: str | None = None,
    source: str | None = None,
) -> list[dict[str, Any]]:
    init_db()
    limit = max(1, min(int(limit or 50), 500))
    clauses: list[str] = []
    params: list[Any] = []
    if status:
        clauses.append("status = ?")
        params.append(status)
    if source:
        clauses.append("source = ?")
        params.append(source)
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    params.append(limit)
    with _connect() as conn:
        rows = conn.execute(
            f"""
            SELECT id, created_at, source, input_text, category, category_ar,
                   confidence, severity, department, status, regulations, lang
            FROM findings
            {where}
            ORDER BY created_at DESC
            LIMIT ?
            """,
            params,
        ).fetchall()
    out: list[dict[str, Any]] = []
    for r in rows:
        d = dict(r)
        try:
            d["regulations"] = json.loads(d.get("regulations") or "[]")
        except json.JSONDecodeError:
            d["regulations"] = []
        out.append(d)
    return out


def get_finding(finding_id: str) -> dict[str, Any] | None:
    init_db()
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM findings WHERE id = ?", (finding_id,)
        ).fetchone()
    if not row:
        return None
    d = dict(row)
    try:
        d["regulations"] = json.loads(d.get("regulations") or "[]")
    except json.JSONDecodeError:
        d["regulations"] = []
    try:
        d["report"] = json.loads(d.get("report_json") or "{}")
    except json.JSONDecodeError:
        d["report"] = {}
    d.pop("report_json", None)
    return d


def clear_all(source: str | None = None) -> int:
    init_db()
    with _connect() as conn:
        if source:
            if source not in _VALID_SOURCE:
                raise ValueError(f"Invalid source: {source}")
            cur = conn.execute("DELETE FROM findings WHERE source = ?", (source,))
        else:
            cur = conn.execute("DELETE FROM findings")
        conn.commit()
        return int(cur.rowcount or 0)


def count_findings() -> int:
    init_db()
    with _connect() as conn:
        row = conn.execute("SELECT COUNT(*) AS n FROM findings").fetchone()
    return int(row["n"] if row else 0)


def _framework_for_control(control_id: str) -> str | None:
    u = (control_id or "").upper()
    if "NCA" in u or "ECC" in u:
        return "NCA ECC"
    if "SAMA" in u or "CSF" in u:
        return "SAMA CSF"
    if "PDPL" in u:
        return "SDAIA PDPL"
    if "NIST" in u:
        return "NIST"
    if "ISO" in u:
        return "ISO"
    return None


def compute_stats() -> dict[str, Any]:
    """All dashboard numbers from accumulated findings."""
    init_db()
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT category, category_ar, severity, department, status, source, regulations
            FROM findings
            """
        ).fetchall()

    total = len(rows)
    open_risks = 0
    critical_risks = 0
    high_risks = 0
    closed = 0
    penalty = 0.0

    risk_by_level = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    risk_by_department: dict[str, int] = {}
    risk_by_category: dict[str, int] = {}
    by_source = {"manual": 0, "excel": 0, "soar": 0}
    framework_hits: dict[str, int] = {
        "NCA ECC": 0,
        "SAMA CSF": 0,
        "SDAIA PDPL": 0,
        "NIST": 0,
        "ISO": 0,
    }

    for r in rows:
        status = r["status"] or "open"
        severity = r["severity"] or "Medium"
        source = r["source"] or "manual"
        dept = (r["department"] or "Unassigned").strip() or "Unassigned"
        cat_ar = r["category_ar"] or r["category"] or "Unknown"

        if source in by_source:
            by_source[source] += 1
        else:
            by_source[source] = by_source.get(source, 0) + 1

        if status == "closed":
            closed += 1
        else:
            open_risks += 1
            risk_by_level[severity] = risk_by_level.get(severity, 0) + 1
            if severity not in risk_by_level:
                risk_by_level[severity] = risk_by_level.get(severity, 0)
            risk_by_department[dept] = risk_by_department.get(dept, 0) + 1
            risk_by_category[cat_ar] = risk_by_category.get(cat_ar, 0) + 1
            penalty += _SEVERITY_WEIGHT.get(severity, 1)
            if severity == "Critical":
                critical_risks += 1
            elif severity == "High":
                high_risks += 1

        try:
            regs = json.loads(r["regulations"] or "[]")
        except json.JSONDecodeError:
            regs = []
        seen_fw: set[str] = set()
        for rid in regs:
            fw = _framework_for_control(str(rid))
            if fw and fw not in seen_fw:
                framework_hits[fw] = framework_hits.get(fw, 0) + 1
                seen_fw.add(fw)

    max_penalty = total * 10 if total else 0
    if total == 0:
        compliance_score = 100
    else:
        compliance_score = round(100 * (1 - min(penalty / max_penalty, 1.0)))

    # Ensure level keys always present for charts
    for k in ("Critical", "High", "Medium", "Low"):
        risk_by_level.setdefault(k, 0)

    return {
        "kpis": {
            "total_findings": total,
            "open_risks": open_risks,
            "critical_risks": critical_risks,
            "high_risks": high_risks,
            "closed": closed,
            "compliance_score": compliance_score,
        },
        "risk_by_level": risk_by_level,
        "framework_coverage": framework_hits,
        "risk_by_department": dict(
            sorted(risk_by_department.items(), key=lambda x: (-x[1], x[0]))
        ),
        "risk_by_category": dict(
            sorted(risk_by_category.items(), key=lambda x: (-x[1], x[0]))
        ),
        "by_source": by_source,
        "db_path": str(DB_PATH.resolve()),
    }
