#!/bin/sh
# Railway Ollama service — official image entry wrapper.
# Image: ollama/ollama
# Volume: mount persistent storage at /root/.ollama
# Model: prefer light qwen2.5:0.5b (or 1.5b if already present).
set -eu

export OLLAMA_HOST="${OLLAMA_HOST:-0.0.0.0}"
MODEL="${OLLAMA_MODEL:-qwen2.5:0.5b}"

ollama serve &
SERVER_PID=$!

echo "Waiting for Ollama API..."
i=0
until ollama list >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -gt 60 ]; then
    echo "Ollama failed to become ready"
    kill "$SERVER_PID" 2>/dev/null || true
    exit 1
  fi
  sleep 2
done

# Prefer an already-installed light model; otherwise pull the configured default.
if ollama list 2>/dev/null | grep -q "qwen2.5:1.5b"; then
  echo "Model already present: qwen2.5:1.5b"
elif ollama list 2>/dev/null | grep -q "$MODEL"; then
  echo "Model already present: $MODEL"
else
  echo "Pulling model: $MODEL"
  ollama pull "$MODEL"
fi

wait "$SERVER_PID"
