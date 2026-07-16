# Imtithal (امتثال) — Local GRC / IAM violation analysis

Local Arabic/English compliance analysis: AraBERT classification, legal-article
retrieval, bilingual reports, conversational assistant, and a **live statistics
dashboard** driven by persisted findings.

## Quick start

```bash
# from this package root (ai-service/current or Imtithal_AItest/…)
python -m venv ../.venv   # or use the shared ai-service/.venv
pip install -r requirements.txt
python server.py
```

- API / analyzer: `http://127.0.0.1:8001/`
- **Dashboard:** `http://127.0.0.1:8001/dashboard`
- Health: `http://127.0.0.1:8001/health`

Run `python check.py` to print model presence and **findings DB record count**.

---

## Dashboard

Every analysis is **one saved SQLite record** (`data/imtithal.db`). The dashboard
computes **all KPIs from those records** — nothing is hardcoded.

### Three data sources

| Source | How it lands in the DB |
|--------|-------------------------|
| **manual** | `POST /analyze` with `save=true` (default) |
| **excel** | `POST /excel/import` (raw body, `.xlsx` / `.csv`) |
| **soar** | `POST /soar/generate` — **mock SOAR prototype** |

### Mock SOAR (prototype)

`POST /soar/generate` invents realistic Arabic SOC-style alerts, runs them through
`pipeline.analyze()`, and saves them with `source=soar`.

This is **not** a live SOAR/SOC integration. It stands in for a future real feed
that can reuse the same analyze→save shape (or a dedicated ingest endpoint).

### Compliance score formula

Over **open** findings (status ≠ `closed`):

- `penalty = sum(severity_weight)` with weights  
  `{Critical: 10, High: 6, Medium: 3, Low: 1}`
- `max_penalty = total_findings * 10`
- `compliance_score = round(100 * (1 - min(penalty / max_penalty, 1)))`
- If there are **zero** findings → score = **100**

Closing a finding reduces open risk and typically **raises** the compliance score.

### Useful endpoints

- `GET /stats` — live KPIs + chart series
- `GET /findings` — latest rows
- `POST /findings/{id}/status` — `{ "status": "open"|"in_progress"|"closed" }`
- `DELETE /findings` — clear all (optional `?source=soar`)
- `GET /excel/template` — sample `.xlsx`
- `POST /excel/import?use_llm=false` — body = file bytes (`application/octet-stream`)

Excel upload intentionally avoids `python-multipart` / `UploadFile` so a missing
multipart dependency cannot crash server startup.
