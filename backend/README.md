# GRCx Backend

## Local run (SQLite — no Docker required)

Full stack guide: [LOCAL_SETUP.md](../LOCAL_SETUP.md)

**Note:** Local backend uses port **8002** (port 8000 is stuck/inaccessible on some Windows hosts). Do not bind to 8000 locally.

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# .env sets USE_SQLITE=true, AI_PROVIDER=raqeeb, AI_SERVICE_URL=http://127.0.0.1:8001
uvicorn app.main:app --reload --host 127.0.0.1 --port 8002
```

OpenAPI: http://127.0.0.1:8002/docs  
Health:  http://127.0.0.1:8002/api/v1/health

Demo user (seeded locally; password stored as Argon2id):
- email: `test@grcx.local`
- password: `123456`
- display name: `Mohammed`
- role: `GRC Specialist`

Auth cookies: `grcx_access`, `grcx_refresh` (HttpOnly).

AI chat (authenticated): `POST /api/v1/ai/chat` → proxies to AI service `/api/v1/chat`.

CORS allow-list (local): `http://localhost:5174`, `http://localhost:5173`.

## Frontend (separate terminal)

```powershell
cd frontend
npm install
npm run dev
```

Set `VITE_API_BASE_URL=http://127.0.0.1:8002/api/v1` in `.env.local`.
