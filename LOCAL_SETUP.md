# GRCx — Local Development (without Docker)

Docker is optional. Use this guide when Docker is unavailable.

## Architecture

```
Frontend (http://localhost:5173)
  → Backend (http://localhost:8002)  POST /api/v1/ai/chat
    → AI Service (http://127.0.0.1:8001)  POST /api/v1/chat
      → Imtithal AraBERT pipeline (singleton classifier → report builder)
```

The browser **never** calls the AI service directly.

**Port note:** Local backend uses **8002**. Do not use port **8000** locally (stuck/inaccessible on some Windows hosts). AI stays on **8001**.

Use **localhost** for the frontend API base URL when the SPA is opened on `localhost` (cookie same-site). CORS allows both `localhost` and `127.0.0.1`.

## Folder layout (AI)

```
ai-service/
  current/                      # Junction → active Imtithal package (preferred)
  Imtithal_AItest-…/Imtithal_AItest/
    imtithal/                   # Engine package
    server.py                   # FastAPI entry
    models/classifier/          # Sole production AraBERT weights
    logs/                       # AI service logs
  .venv/
  logs/
```

Runtime loads **only** `models/classifier/` (`model.safetensors`). No TF-IDF, no sklearn fallback, no duplicate checkpoints at runtime.

## Environment files

| File | Purpose |
|------|---------|
| `backend/.env` | `USE_SQLITE=true`, `BACKEND_PORT=8002`, `AI_PROVIDER=imtithal`, `AI_SERVICE_URL=http://127.0.0.1:8001`, CORS for localhost + 127.0.0.1 |
| `AI_PORT` / `AI_HOST` | Optional; defaults `8001` / `127.0.0.1` |
| `frontend/.env.local` | `VITE_API_BASE_URL=http://localhost:8002/api/v1`, `VITE_USE_MOCKS=false` |

## Quick start

```powershell
.\start-local.ps1
```

Or manually:

```powershell
# AI (from ai-service/current or package path)
cd ai-service\current
..\ .venv\Scripts\Activate.ps1
$env:AI_PORT=8001
python server.py

# Backend
cd backend
.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 0.0.0.0 --port 8002

# Frontend
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

Demo login: `test@grcx.local` / `123456`

## Health checks

- AI: `http://127.0.0.1:8001/health` → `model_loaded=true`, `classifier=arabert`
- AI ready: `http://127.0.0.1:8001/ready`
- Backend: `http://127.0.0.1:8002/api/v1/health`
- Backend AI status (auth required): `GET /api/v1/ai/status`

## Logs

| Service | Location |
|---------|----------|
| AI | `ai-service/current/logs/ai-service.log` |
| Backend | `backend/logs/backend.log` |
| Root | `logs/` (reserved) |

## Obsolete packages

`ai-service/Imtithal_AI_v2.1` is obsolete. Delete manually if Windows has the folder locked by an old shell cwd. Startup scripts do **not** use it.
