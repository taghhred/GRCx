# -*- coding: utf-8 -*-
"""Verify dashboard / SOAR / Excel / status→score pipeline."""
from __future__ import annotations

import json
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8001"


def req(method: str, path: str, body: bytes | None = None, headers: dict | None = None):
    h = dict(headers or {})
    if body is not None and "Content-Type" not in h:
        h["Content-Type"] = "application/json"
    r = urllib.request.Request(BASE + path, data=body, headers=h, method=method)
    with urllib.request.urlopen(r, timeout=300) as resp:
        raw = resp.read()
        ctype = resp.headers.get("Content-Type", "")
        if "json" in ctype or path.startswith("/stats") or path.startswith("/findings") or path.startswith("/soar") or path.startswith("/excel/import"):
            return resp.status, json.loads(raw.decode("utf-8") if raw else "{}"), resp.headers
        return resp.status, raw, resp.headers


def main() -> None:
    # clear
    status, data, _ = req("DELETE", "/findings")
    print("cleared", data.get("deleted"), "score", data["stats"]["kpis"]["compliance_score"])

    # SOAR
    status, soar, _ = req("POST", "/soar/generate", json.dumps({"count": 8, "use_llm": False}).encode())
    print("soar generated", soar.get("generated"), "requested", soar.get("requested"))
    assert soar.get("generated") == 8, soar
    status, stats, _ = req("GET", "/stats")
    print("stats after soar", stats["kpis"])
    assert stats["kpis"]["total_findings"] >= 8
    assert stats["kpis"]["open_risks"] >= 1
    open_before = stats["kpis"]["open_risks"]
    score_before = stats["kpis"]["compliance_score"]

    # excel template
    status, blob, headers = req("GET", "/excel/template")
    assert status == 200
    assert len(blob) > 500
    cd = headers.get("Content-Disposition", "")
    print("template bytes", len(blob), "disposition", cd)
    assert "xlsx" in cd.lower() or "spreadsheet" in (headers.get("Content-Type") or "")

    status, imp, _ = req(
        "POST",
        "/excel/import?use_llm=false",
        blob if isinstance(blob, bytes) else blob,
        {"Content-Type": "application/octet-stream"},
    )
    print("excel import", imp)
    assert imp.get("imported") == 3, imp

    # status change → score
    status, findings, _ = req("GET", "/findings?limit=5")
    rows = findings["findings"]
    assert rows, "no findings"
    fid = rows[0]["id"]
    status, upd, _ = req(
        "POST",
        f"/findings/{fid}/status",
        json.dumps({"status": "closed"}).encode(),
    )
    k = upd["stats"]["kpis"]
    print("after close", k)
    assert k["open_risks"] == open_before + 3 - 1  # +3 excel then -1 closed; wait open_before was after soar only
    # Recalculate expectation more carefully:
    status, stats2, _ = req("GET", "/stats")
    k2 = stats2["kpis"]
    print("final stats", k2)
    assert k2["closed"] >= 1
    assert k2["open_risks"] < k2["total_findings"]
    # closing should not decrease score vs all-open-of-same-set; compare to score with that finding open
    # Soft check: compliance_score is int 0-100
    assert 0 <= k2["compliance_score"] <= 100

    # Re-open then close again measuring score rise
    status, findings, _ = req("GET", "/findings?status=open&limit=1")
    if findings["findings"]:
        fid2 = findings["findings"][0]["id"]
        status, s_open, _ = req("GET", "/stats")
        score_open = s_open["kpis"]["compliance_score"]
        open_n = s_open["kpis"]["open_risks"]
        req("POST", f"/findings/{fid2}/status", json.dumps({"status": "closed"}).encode())
        status, s_closed, _ = req("GET", "/stats")
        print("score open→closed", score_open, "→", s_closed["kpis"]["compliance_score"], "open", open_n, "→", s_closed["kpis"]["open_risks"])
        assert s_closed["kpis"]["open_risks"] == open_n - 1
        assert s_closed["kpis"]["compliance_score"] >= score_open

    # dashboard html
    status, html, _ = req("GET", "/dashboard")
    assert status == 200
    text = html.decode("utf-8") if isinstance(html, bytes) else str(html)
    assert "درجة الامتثال" in text or "compliance" in text.lower()
    print("dashboard OK")
    print("PASS")


if __name__ == "__main__":
    main()
