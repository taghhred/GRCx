# GRCx deployment — Vercel (frontend) + Railway (backend, AI, Ollama)

Do **not** push or deploy from this document alone. Configure services with the
exact settings below after secrets and AraBERT weights are ready.

## Architecture

```
Browser (Vercel SPA)
  → HTTPS public Backend (Railway FastAPI)
    → private AI service (Railway)
      → private Ollama (Railway)  qwen2.5:3b
      → AraBERT classifier (local weights in AI container/volume)
```

Rules:
- Frontend calls **only** the public backend (`VITE_API_BASE_URL`).
- Frontend never calls the AI service or Ollama.
- Backend calls AI via `AI_SERVICE_URL` (Railway private URL).
- AI calls Ollama via `OLLAMA_BASE_URL` (Railway private URL).
- AraBERT is the only classifier; there is **no** TF-IDF fallback.
- `model.safetensors` (~516 MB) is **gitignored** — supply via Railway volume.

## Inspected repository facts

| Item | Path / value |
|------|----------------|
| Frontend root | `frontend/` |
| Backend root | `backend/` |
| AI-service root | `ai-service/` (runtime package `ai-service/current/`) |
| Backend entry | `backend/app/main.py` → `uvicorn app.main:app` |
| AI entry | `ai-service/current/server.py` → `uvicorn server:app` |
| Active AI package | `ai-service/current` → Imtithal package |
| Health (backend) | `GET /api/v1/health`, `GET /api/v1/ready` |
| Health (AI) | `GET /health`, `GET /ready` |
| Default Ollama URL (local) | `http://127.0.0.1:11434` (`OLLAMA_URL` / `OLLAMA_BASE_URL`) |
| Production chat model | `qwen2.5:3b` (`OLLAMA_MODEL`) |
| Classifier | AraBERT at `models/classifier/` (`model.safetensors`) |

### Localhost references (must be overridden in production)

| Location | Local default |
|----------|----------------|
| `frontend/src/services/api/config.ts` | `http://localhost:8002/api/v1` (dev only; prod requires env) |
| `backend/app/core/config.py` | `AI_SERVICE_URL=http://127.0.0.1:8001` |
| `ai-service/current/imtithal/llm.py` | `OLLAMA_*` default `http://127.0.0.1:11434` |
| `ai-service/current/server.py` | binds `127.0.0.1` unless `PORT` / production |
| Scripts under `scripts/` | local verification only |

---

## VERCEL FRONTEND

| Setting | Value |
|---------|--------|
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm ci` (or `npm install`) |
| **Framework** | Vite |

### Environment variables (Vercel)

| Name | Value |
|------|--------|
| `VITE_API_BASE_URL` | `https://<your-public-backend>.up.railway.app/api/v1` |
| `VITE_USE_MOCKS` | `false` |

SPA rewrites: `frontend/vercel.json` is included.

---

## RAILWAY BACKEND

| Setting | Value |
|---------|--------|
| **Root Directory** | `backend` |
| **Builder** | Dockerfile (`backend/Dockerfile`) |
| **Start Command** | *(Dockerfile CMD)* `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Health check path** | `/api/v1/health` |
| **Public networking** | **Enabled** (browser + Vercel reach this service) |

### Environment variables

| Name | Value / notes |
|------|----------------|
| `GRCX_ENV` | `production` |
| `PORT` | *(Railway injects)* |
| `SECRET_KEY` | strong random secret |
| `CORS_ORIGINS` | `https://<your-vercel-app>.vercel.app` (comma-separated if multiple) |
| `DATABASE_URL` | Railway Postgres URL using `postgresql+psycopg://...` |
| `USE_SQLITE` | `false` (omit or false) |
| `AI_PROVIDER` | `local_http` (Ollama) |
| `OLLAMA_BASE_URL` | `http://ollama.railway.internal:11434` (private DNS — never public / localhost) |
| `OLLAMA_MODEL` | `qwen2.5:3b` (exact tag) |
| `AI_REQUEST_TIMEOUT_SECONDS` | `120` (raise if cold model loads are slow) |
| Memory (Ollama service) | **≥ 4–8 GB RAM** — `qwen2.5:3b` inference returns HTTP 500 if the service OOMs |
| `AI_SERVICE_URL` | only when using `AI_PROVIDER=imtithal` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` |

`AI_SERVICE_URL` must use **private** Railway DNS when `AI_PROVIDER=imtithal`.

When `AI_PROVIDER=local_http`, the backend calls Ollama natively:

- `GET {OLLAMA_BASE_URL}/api/tags`
- `POST {OLLAMA_BASE_URL}/api/chat` (`stream: false`, reads `message.content`)

It does **not** use OpenAI `/v1/chat/completions`. Do not point `OLLAMA_BASE_URL` at localhost in production.

---

## RAILWAY AI SERVICE

| Setting | Value |
|---------|--------|
| **Root Directory** | `ai-service` |
| **Builder** | Dockerfile (`ai-service/Dockerfile`) |
| **Start Command** | `/app/start.sh` (Dockerfile default) |
| **Health check path** | `/health` |
| **Public networking** | **Disabled** (backend-only via private network) |
| **Memory** | ≥ 4 GB recommended (AraBERT + Python) |

### Environment variables

| Name | Value / notes |
|------|----------------|
| `GRCX_ENV` | `production` |
| `PORT` | *(Railway injects)* |
| `AI_HOST` | `0.0.0.0` |
| `AI_SERVICE_TOKEN` | same shared secret as backend |
| `OLLAMA_BASE_URL` | `http://<ollama-service-name>.railway.internal:11434` |
| `OLLAMA_MODEL` | `qwen2.5:3b` |
| `ARABERT_WEIGHTS_SRC` | `/data/arabert/model.safetensors` (if using volume) |
| `ALLOW_LOCAL_OLLAMA` | omit / `0` in production |

### AraBERT volume (required — weights not in Git)

1. Attach a Railway volume to the AI service.
2. Mount path for weights source: `/data/arabert`
3. Upload local file:
   `ai-service/current/models/classifier/model.safetensors`
   → `/data/arabert/model.safetensors`
4. Startup copies it to `/app/models/classifier/model.safetensors` when missing.

`/ready` returns **503** until AraBERT weights are present (no TF-IDF fallback).

---

## RAILWAY OLLAMA

| Setting | Value |
|---------|--------|
| **Docker Image** | `ollama/ollama` |
| **Volume Mount Path** | `/root/.ollama` |
| **Public networking** | **Disabled** (AI service only) |
| **Memory / disk** | ≥ 4 GB RAM; volume ≥ 8 GB for `qwen2.5:3b` |

### Required variables

| Name | Value |
|------|--------|
| `OLLAMA_HOST` | `0.0.0.0` |
| `OLLAMA_MODEL` | `qwen2.5:3b` |

### Start / model pull

Use custom start command (repo script `ollama/start.sh`):

```sh
sh -c 'ollama serve & pid=$!; until ollama list >/dev/null 2>&1; do sleep 2; done; ollama list | grep -q qwen2.5:3b || ollama pull qwen2.5:3b; wait $pid'
```

Or mount/copy `ollama/start.sh` into the container and run it.

**Model pull command (manual):**

```sh
ollama pull qwen2.5:3b
```

Only pulls when the model is not already present (script checks `ollama list`).

---

## Production Docker / startup files

| File | Purpose |
|------|---------|
| `backend/Dockerfile` | Backend image; binds `0.0.0.0:$PORT` |
| `backend/start.sh` | Alternate start command |
| `ai-service/Dockerfile` | AI image (torch CPU + transformers) |
| `ai-service/start.sh` | Binds `$PORT`, installs AraBERT weights, rejects localhost Ollama |
| `ai-service/requirements.prod.txt` | Production Python deps |
| `ollama/start.sh` | Serve + conditional `qwen2.5:3b` pull |

## Health checks

| Service | Path | Expect |
|---------|------|--------|
| Backend | `GET /api/v1/health` | `{"status":"ok","service":"grcx-api"}` |
| Backend | `GET /api/v1/ready` | `{"status":"ready"}` |
| AI | `GET /health` | `model_loaded=true`, classifier arabert |
| AI | `GET /ready` | HTTP 200 only when AraBERT weights loaded |
| Ollama | `GET /api/tags` | JSON model list includes `qwen2.5:3b` |

## Cookie / CORS notes

- Backend sets `SameSite=None; Secure` cookies when `GRCX_ENV=production` so the Vercel origin can authenticate cross-site.
- `CORS_ORIGINS` must list the exact Vercel HTTPS origin(s).
- Frontend uses `credentials: "include"` against the public backend only.

## Local verification (optional)

```powershell
# From repo root
cd backend; uvicorn app.main:app --host 0.0.0.0 --port 8002
cd ai-service/current; $env:AI_HOST='127.0.0.1'; $env:AI_PORT='8001'; python server.py
cd frontend; npm run dev
```

Do **not** `git push` or deploy until AraBERT weights and secrets are configured.
