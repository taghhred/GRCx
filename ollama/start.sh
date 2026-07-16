#!/bin/sh
# Railway Ollama service — official image entry wrapper.
# Image: ollama/ollama
# Volume: mount persistent storage at /root/.ollama
# Model: pull qwen2.5:3b only when missing.
set -eu

export OLLAMA_HOST="${OLLAMA_HOST:-0.0.0.0}"
MODEL="${OLLAMA_MODEL:-qwen2.5:3b}"

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

if ollama list 2>/dev/null | grep -q "$MODEL"; then
  echo "Model already present: $MODEL"
else
  echo "Pulling model: $MODEL"
  ollama pull "$MODEL"
fi

wait "$SERVER_PID"
