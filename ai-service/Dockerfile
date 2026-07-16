# GRCx AI service — Imtithal (AraBERT + Ollama client)
# Build context: ai-service/
# Active package: ./current (junction/copy of Imtithal_AItest package)

FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    AI_HOST=0.0.0.0 \
    PORT=8001 \
    GRCX_ENV=production \
    # Prefer private Ollama URL in production (override on Railway).
    OLLAMA_BASE_URL=http://ollama.railway.internal:11434 \
    OLLAMA_MODEL=qwen2.5:3b

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# CPU torch wheel index keeps the image deployable without GPU nodes.
COPY requirements.prod.txt /tmp/requirements.prod.txt
RUN pip install --no-cache-dir \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    -r /tmp/requirements.prod.txt \
    && rm /tmp/requirements.prod.txt

# Runtime package (includes tokenizer/config; model.safetensors is gitignored —
# mount it at /app/models/classifier/model.safetensors or set ARABERT_WEIGHTS_SRC).
COPY current/ /app/

COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh \
    && mkdir -p /app/models/classifier /data/arabert

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=10s --start-period=180s --retries=5 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:%s/health' % (__import__('os').environ.get('PORT','8001')), timeout=5)"

CMD ["/app/start.sh"]
