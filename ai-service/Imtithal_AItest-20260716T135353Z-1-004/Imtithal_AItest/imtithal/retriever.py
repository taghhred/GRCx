# -*- coding: utf-8 -*-
"""Legal article corpus loader (production).

Retrieval ML backends (SBERT/TF-IDF) are disabled. Article metadata remains
available for reporting counts; search returns [] until a retrieval model
is explicitly productized.
"""
from __future__ import annotations

import json
import logging
import re

from .config import ARTICLES_JSON, SOURCE_PRIORITY

logger = logging.getLogger("imtithal.retriever")


def load_articles() -> list[dict]:
    if not ARTICLES_JSON.exists():
        return []
    with open(ARTICLES_JSON, encoding="utf-8") as f:
        arts = json.load(f)
    for a in arts:
        pr = a.get("priority")
        try:
            a["priority"] = float(pr)
        except (TypeError, ValueError):
            path = str(a.get("pdf_path", ""))
            a["priority"] = next(
                (v for k, v in SOURCE_PRIORITY.items() if k in path), 1.0
            )
    return arts


def _clean_snippet(text: str, limit: int = 420) -> str:
    t = re.sub(r"\s+", " ", (text or "")).strip()
    return t[:limit]


def _format_hit(a: dict, score: float) -> dict:
    return {
        "id": a.get("id", ""),
        "title": a.get("title") or a.get("id", ""),
        "text": _clean_snippet(a.get("text", "")),
        "similarity": round(score, 1),
        "source": a.get("source", ""),
        "pdf_path": a.get("pdf_path", ""),
    }


class LegalRetriever:
    def __init__(self, prefer: str | None = None):
        self.articles = load_articles()
        self.errors: dict[str, str] = {}
        self.backend = None
        if prefer:
            self.errors["retriever"] = (
                f"Retrieval prefer={prefer!r} disabled in production; "
                "classifier-only mode."
            )
            logger.warning(self.errors["retriever"])
        elif not self.articles:
            self.errors["data"] = "legal_articles_from_pdfs.json missing"
        else:
            logger.info("Articles loaded count=%s (retrieval model not enabled)", len(self.articles))

    @property
    def backend_name(self) -> str:
        return "none"

    @property
    def backend_label(self) -> str:
        return "Retrieval disabled (classifier-only production mode)"

    def search(self, query: str, top_k: int = 4) -> list[dict]:
        return []
