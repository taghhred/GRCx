# GRCx Architecture

Local-first GRC platform: React frontend (preserved) + FastAPI + PostgreSQL.
No external cloud AI. Local model provider is a pluggable interface only.

---

## 1. Existing architecture summary

### Frontend (preserve)
- Vite + React 19 + TypeScript + React Router 7 + CSS modules
- Domain pages already shipped: Dashboard, SOAR Queue (`/grc-cases`), Identity, Risk, Compliance, BCM, DR, Reports
- Floating AI Advisor (session Context) — no backend yet
- Data today: `src/mocks/**` seeds + in-memory `operationalDataStore` (FastAPI swap point already documented)
- Excel: browser `xlsx` via `services/excel/**`
- PDF: HTML print window (`pdfExportService` / `reportPdfBuilder`) — no PDF npm lib
- Auth today: `CURRENT_USER` placeholder in `collaborationService` (Mohammed)

### Not present yet
- No `backend/`, no Docker, no Postgres, no `.env`, no HTTP API client

---

## 2. Files to preserve

- All `frontend/src/pages/**` (approved UX)
- All `frontend/src/components/**` (incl. AI floating widget)
- Router paths (stable URLs)
- Excel schemas / adapters
- Mock data (fallback when `VITE_USE_MOCKS=true`)

## 3. Files to modify (non-breaking)

- `frontend/src/mocks/services/*` — gradually call API clients behind a flag
- `frontend/src/App.tsx` / layout — AuthProvider later
- Add `frontend/.env.example` (`VITE_API_BASE_URL`, `VITE_USE_MOCKS`)

## 4. Files / packages to create

```
grcx/
├── docs/ARCHITECTURE.md          (this file)
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/                 (config, security, deps)
│   │   ├── db/                   (session, base, migrations)
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── api/v1/               (routers)
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── ai/                   (LocalAIProvider protocol)
│   │   └── workers/              (optional jobs)
│   ├── tests/
│   ├── alembic/
│   ├── pyproject.toml / requirements.txt
│   └── Dockerfile
└── frontend/                     (existing)
```

---

## 5. Database plan (PostgreSQL)

Core:
- `users`, `roles`, `permissions`, `user_roles`, `sessions` / refresh tokens
- `audit_events`, `notifications`

Domains (aligned to mock types):
- `identity_rows`
- `soar_cases` (+ evidence, remediation_tasks, activity_log, collaborators)
- `risk_cases` (+ assessments, controls, evidence, tasks)
- `compliance_assets` (+ failed_controls)
- `bcm_processes`
- `dr_systems`, `dr_tests`
- `reports` (+ sections / generation jobs)
- `excel_import_batches`

Use UUIDs PKs, timestamptz, soft-delete where appropriate, FK to `users.id`.

---

## 6. API plan (`/api/v1`)

| Area | Prefix | Notes |
|------|--------|-------|
| Health | `/health` | liveness/readiness |
| Auth | `/auth` | login, refresh, logout, me |
| Users/RBAC | `/users`, `/roles` | admin |
| Dashboard | `/dashboard` | KPIs + widgets |
| Identity | `/identities` | CRUD + import |
| SOAR Queue | `/cases` | intake + lifecycle |
| Risk | `/risks` | cases + collab |
| Compliance | `/compliance/assets` | |
| BCM | `/bcm` | |
| DR | `/dr` | |
| Reports | `/reports` | generate + PDF optional server-side later |
| Excel | `/imports`, `/exports` | |
| Notifications | `/notifications` | |
| Audit | `/audit` | |
| AI | `/ai/chat` | **LocalAIProvider only** |

Versioned OpenAPI at `/docs`.

---

## 7. Authentication plan

- Local username/password (bcrypt/argon2)
- JWT access (short) + refresh (httpOnly cookie or rotating refresh table)
- FastAPI dependencies: `get_current_user`, `require_permissions(...)`
- Roles (seed): `Admin`, `GRC Specialist`, `Risk Owner`, `Auditor`, `Viewer`
- Frontend: AuthContext replaces `CURRENT_USER` when mocks off; routes stay public in mock mode

---

## 8. AI integration plan

- `backend/app/ai/provider.py` — Protocol: `generate(messages, context) -> str`
- Default: `StubLocalAIProvider` (deterministic prototype text)
- Config: `AI_PROVIDER=stub|local_http`, `LOCAL_AI_BASE_URL` (e.g. Ollama-compatible later)
- **Never** call external cloud AI APIs
- Frontend `AiAdvisorContext.sendMessage` → `POST /api/v1/ai/chat` when mocks off

---

## 9. Phased implementation

| Phase | Deliverable |
|-------|-------------|
| **1** | Docker Compose (Postgres), FastAPI app skeleton, health, config, AI stub, frontend API client + mock flag |
| **2** | Auth + users + RBAC + sessions + audit middleware |
| **3** | Domain CRUD for Identity, Cases, Risk, Compliance (seed from mocks) |
| **4** | BCM, DR, Dashboard aggregations, Notifications |
| **5** | Reports generation jobs + Excel import server validation |
| **6** | Wire frontend modules off mocks one-by-one; automated API tests; harden security headers |

---

## Security (local production-style)

- No secrets in frontend; CORS locked to local origins
- Parameterized SQL (SQLAlchemy)
- File upload size/type limits for Excel
- Audit every mutating admin/action
- Rate-limit auth endpoints
