# -*- coding: utf-8 -*-
"""Production classifier — AraBERT only (loaded once at process startup)."""
from __future__ import annotations

import logging
import time

from .config import CLASSIFIER_DIR

logger = logging.getLogger("imtithal.classifier")

NO_MODEL_MESSAGE = "No trained model installed."


def arabert_weights_present() -> bool:
    return (CLASSIFIER_DIR / "model.safetensors").exists() or (
        CLASSIFIER_DIR / "pytorch_model.bin"
    ).exists()


def checkpoint_filename() -> str | None:
    if (CLASSIFIER_DIR / "model.safetensors").exists():
        return "model.safetensors"
    if (CLASSIFIER_DIR / "pytorch_model.bin").exists():
        return "pytorch_model.bin"
    return None


class _NoModelBackend:
    name = "none"
    label_ar = NO_MODEL_MESSAGE

    def predict_proba(self, text: str) -> dict[str, float]:
        raise RuntimeError(NO_MODEL_MESSAGE)


class _AraBertBackend:
    """Single in-memory AraBERT classifier + tokenizer (process lifetime)."""

    name = "arabert"
    label_ar = "AraBERT المدرّب"

    def __init__(self) -> None:
        import torch
        from transformers import AutoModelForSequenceClassification, AutoTokenizer

        weights = CLASSIFIER_DIR / "model.safetensors"
        weights_bin = CLASSIFIER_DIR / "pytorch_model.bin"
        if not weights.exists() and not weights_bin.exists():
            raise FileNotFoundError(NO_MODEL_MESSAGE)

        t0 = time.perf_counter()
        self.torch = torch
        self.tokenizer = AutoTokenizer.from_pretrained(str(CLASSIFIER_DIR))
        self.model = AutoModelForSequenceClassification.from_pretrained(str(CLASSIFIER_DIR))
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device).eval()
        self.id2label = {int(k): v for k, v in self.model.config.id2label.items()}
        self.checkpoint = checkpoint_filename()
        self.model_path = str(CLASSIFIER_DIR.resolve())
        logger.info(
            "AraBERT loaded path=%s checkpoint=%s device=%s labels=%s load_ms=%.0f",
            self.model_path,
            self.checkpoint,
            self.device,
            len(self.id2label),
            (time.perf_counter() - t0) * 1000,
        )

    def predict_proba(self, text: str) -> dict[str, float]:
        inputs = self.tokenizer(text, return_tensors="pt", truncation=True, max_length=256)
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        with self.torch.no_grad():
            probs = self.torch.softmax(self.model(**inputs).logits, dim=-1)[0]
        return {self.id2label[i]: float(p) for i, p in enumerate(probs.cpu())}


class LocalClassifier:
    """Production classifier: AraBERT only. Instantiated once via ImtithalPipeline."""

    def __init__(self, prefer: str | None = None) -> None:
        self.errors: dict[str, str] = {}
        self.backend: _AraBertBackend | _NoModelBackend
        try:
            if prefer not in (None, "arabert"):
                raise ValueError(f"Unsupported classifier prefer={prefer!r}; only arabert")
            self.backend = _AraBertBackend()
        except Exception as exc:  # noqa: BLE001
            self.errors["arabert"] = str(exc)
            logger.warning("AraBERT unavailable: %s", exc)
            self.backend = _NoModelBackend()

    @property
    def backend_name(self) -> str:
        return self.backend.name

    @property
    def backend_label(self) -> str:
        return self.backend.label_ar

    @property
    def model_loaded(self) -> bool:
        return self.backend_name == "arabert"

    @property
    def model_path(self) -> str | None:
        return getattr(self.backend, "model_path", None)

    @property
    def checkpoint(self) -> str | None:
        return getattr(self.backend, "checkpoint", None)

    def predict(self, text: str, top_k: int = 3) -> list[dict]:
        if not self.model_loaded:
            raise RuntimeError(NO_MODEL_MESSAGE)
        t0 = time.perf_counter()
        probs = self.backend.predict_proba(text)
        top = sorted(probs.items(), key=lambda kv: kv[1], reverse=True)[:top_k]
        logger.info(
            "infer engine=arabert top=%s conf=%.1f ms=%.0f",
            top[0][0] if top else None,
            (top[0][1] * 100) if top else 0.0,
            (time.perf_counter() - t0) * 1000,
        )
        return [{"category": c, "confidence": round(p * 100, 1)} for c, p in top]
