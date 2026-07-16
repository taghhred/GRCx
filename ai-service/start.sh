#!/bin/sh
# Production startup for Railway AI service.
set -eu

PORT="${PORT:-${AI_PORT:-8001}}"
export AI_HOST="${AI_HOST:-0.0.0.0}"
export GRCX_ENV="${GRCX_ENV:-production}"

# Optional: copy AraBERT weights from a Railway volume into the expected path.
# Volume example mount: /data/arabert  containing model.safetensors
WEIGHTS_DST="/app/models/classifier/model.safetensors"
WEIGHTS_SRC="${ARABERT_WEIGHTS_SRC:-/data/arabert/model.safetensors}"
if [ ! -f "$WEIGHTS_DST" ] && [ -f "$WEIGHTS_SRC" ]; then
  echo "Installing AraBERT weights from $WEIGHTS_SRC"
  cp "$WEIGHTS_SRC" "$WEIGHTS_DST"
fi

if [ ! -f "$WEIGHTS_DST" ] && [ ! -f /app/models/classifier/pytorch_model.bin ]; then
  echo "WARNING: AraBERT weights missing at $WEIGHTS_DST — /ready will return 503"
fi

# Fail loudly if production still points Ollama at localhost.
OLLAMA_TARGET="${OLLAMA_BASE_URL:-${OLLAMA_URL:-}}"
case "$OLLAMA_TARGET" in
  *localhost*|*127.0.0.1*)
    if [ "${ALLOW_LOCAL_OLLAMA:-0}" != "1" ]; then
      echo "ERROR: OLLAMA_BASE_URL must not use localhost in production: $OLLAMA_TARGET"
      echo "Set OLLAMA_BASE_URL to the Railway private Ollama URL (e.g. http://ollama.railway.internal:11434)"
      echo "Or set ALLOW_LOCAL_OLLAMA=1 only for local Docker bring-up."
      exit 1
    fi
    ;;
esac

exec python -m uvicorn server:app --host "$AI_HOST" --port "$PORT"
