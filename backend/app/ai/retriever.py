"""Compact keyword retrieval over the approved GRCx knowledge base."""
from __future__ import annotations

import json
import logging
import os
import re
import time
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

logger = logging.getLogger("grcx.ai.retriever")

_TOKEN_RE = re.compile(r"[a-zA-Z\u0600-\u06FF0-9_]{2,}")
_TOP_K = 3
_MAX_CHUNK_CHARS = 420
_MAX_TOTAL_CONTEXT_CHARS = 1200
# Minimum keyword overlap score (absolute) to accept a hit.
_MIN_SCORE = 2.5


@dataclass(frozen=True)
class Chunk:
    id: str
    title: str
    source: str
    text: str
    tokens: frozenset[str]


def _default_kb_path() -> Path:
    env = (os.environ.get("GRCX_KB_PATH") or "").strip()
    if env:
        return Path(env)
    # backend/data/grc_kb.json relative to this package → app/ai → app → backend
    return Path(__file__).resolve().parents[2] / "data" / "grc_kb.json"


def _tokenize(text: str) -> frozenset[str]:
    return frozenset(t.lower() for t in _TOKEN_RE.findall(text or ""))


@lru_cache(maxsize=1)
def load_chunks() -> tuple[Chunk, ...]:
    path = _default_kb_path()
    t0 = time.perf_counter()
    if not path.is_file():
        logger.warning("kb_missing path=%s", path.name)
        return tuple()
    raw = json.loads(path.read_text(encoding="utf-8"))
    chunks: list[Chunk] = []
    seen_ids: set[str] = set()
    for item in raw:
        if not isinstance(item, dict):
            continue
        cid = str(item.get("id") or "").strip()
        title = str(item.get("title") or "").strip() or "Untitled"
        source = str(item.get("source") or "").strip() or "GRCx KB"
        text = str(item.get("text") or "").strip()
        if not cid or not text or cid in seen_ids:
            continue
        seen_ids.add(cid)
        blob = f"{title} {source} {text}"
        chunks.append(
            Chunk(
                id=cid[:96],
                title=title[:200],
                source=source[:120],
                text=text[:900],
                tokens=_tokenize(blob),
            )
        )
    logger.info(
        "kb_loaded chunks=%s ms=%.0f path=%s",
        len(chunks),
        (time.perf_counter() - t0) * 1000,
        path.name,
    )
    return tuple(chunks)


def retrieve(
    query: str,
    *,
    top_k: int = _TOP_K,
    min_score: float = _MIN_SCORE,
) -> tuple[list[dict[str, Any]], dict[str, float]]:
    """Return top-k unique chunks with timing metadata (no secrets logged)."""
    t0 = time.perf_counter()
    q_tokens = _tokenize(query)
    chunks = load_chunks()
    scored: list[tuple[float, Chunk]] = []
    for chunk in chunks:
        overlap = q_tokens & chunk.tokens
        if not overlap:
            continue
        # Prefer denser overlap and slightly boost regulatory keywords in title/source.
        score = float(len(overlap))
        title_src = f"{chunk.title} {chunk.source}".lower()
        for boost in ("nca", "ecc", "sama", "pdpl", "iam", "bcm", "drp", "iso", "pci"):
            if boost in title_src and boost in q_tokens:
                score += 1.25
        if score >= min_score:
            scored.append((score, chunk))
    scored.sort(key=lambda x: (-x[0], x[1].id))

    picked: list[dict[str, Any]] = []
    seen_text: set[str] = set()
    total_chars = 0
    for score, chunk in scored:
        norm = re.sub(r"\s+", " ", chunk.text.lower())[:160]
        if norm in seen_text:
            continue
        seen_text.add(norm)
        excerpt = chunk.text[:_MAX_CHUNK_CHARS].strip()
        if total_chars + len(excerpt) > _MAX_TOTAL_CONTEXT_CHARS and picked:
            break
        picked.append(
            {
                "id": chunk.id,
                "title": chunk.title,
                "source": chunk.source,
                "text": excerpt,
                "score": round(score, 2),
            }
        )
        total_chars += len(excerpt)
        if len(picked) >= top_k:
            break

    ms = (time.perf_counter() - t0) * 1000
    timings = {"retrieval_ms": ms, "candidates": float(len(scored))}
    logger.info(
        "retrieve hits=%s scored=%s ms=%.0f",
        len(picked),
        len(scored),
        ms,
    )
    return picked, timings
