#!/bin/sh
# Production startup for Railway backend (FastAPI).
set -eu
PORT="${PORT:-8000}"
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
