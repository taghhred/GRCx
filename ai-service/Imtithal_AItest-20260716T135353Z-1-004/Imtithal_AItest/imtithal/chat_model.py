# -*- coding: utf-8 -*-
"""Optional local causal / chat LLM loader (NOT AraBERT).

Looks for a developer-provided chat checkpoint under:
  models/chat/  or  models/llm/  or  $IMTITHAL_CHAT_MODEL_DIR

AraBERT (BertForSequenceClassification) is never loaded here.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

logger = logging.getLogger("imtithal.chat_model")

ROOT = Path(__file__).resolve().parents[1]


def _candidate_dirs() -> list[Path]:
    dirs: list[Path] = []
    env = (os.environ.get("IMTITHAL_CHAT_MODEL_DIR") or "").strip()
    if env:
        dirs.append(Path(env))
    dirs.extend(
        [
            ROOT / "models" / "chat",
            ROOT / "models" / "llm",
            ROOT / "models" / "chat_model",
        ]
    )
    return dirs


def _has_weights(path: Path) -> bool:
    if not path.is_dir():
        return False
    for name in ("model.safetensors", "pytorch_model.bin", "model.gguf"):
        if (path / name).exists():
            return True
    # sharded safetensors
    if any(path.glob("*.safetensors")) or any(path.glob("*.gguf")):
        return True
    return False


def _architecture(path: Path) -> str | None:
    cfg = path / "config.json"
    if not cfg.exists():
        return None
    try:
        import json

        data = json.loads(cfg.read_text(encoding="utf-8"))
        arch = data.get("architectures") or []
        if arch:
            return str(arch[0])
        return str(data.get("model_type") or "")
    except Exception:  # noqa: BLE001
        return None


class LocalChatModel:
    """HuggingFace CausalLM wrapper for conversational generation."""

    def __init__(self) -> None:
        self.available = False
        self.model_name = "none"
        self.checkpoint_path: str | None = None
        self.tokenizer_name: str | None = None
        self.architecture: str | None = None
        self.error: str | None = None
        self._model = None
        self._tokenizer = None
        self._load()

    def _load(self) -> None:
        chosen: Path | None = None
        for d in _candidate_dirs():
            d = d.resolve()
            if not _has_weights(d):
                continue
            arch = _architecture(d) or ""
            # Refuse classifier checkpoints (AraBERT)
            if "SequenceClassification" in arch or arch.lower() in {"bert", "arabert"}:
                logger.warning("Skipping classifier checkpoint at %s (arch=%s)", d, arch)
                continue
            chosen = d
            self.architecture = arch
            break

        if chosen is None:
            self.error = (
                "No trained chat CausalLM found under models/chat, models/llm, "
                "or IMTITHAL_CHAT_MODEL_DIR. AraBERT classifier is not a chat model."
            )
            logger.warning("%s", self.error)
            return

        try:
            import torch
            from transformers import AutoModelForCausalLM, AutoTokenizer

            logger.info("Loading chat LLM from %s …", chosen)
            self._tokenizer = AutoTokenizer.from_pretrained(str(chosen), trust_remote_code=True)
            self._model = AutoModelForCausalLM.from_pretrained(
                str(chosen),
                torch_dtype=torch.float32,
                trust_remote_code=True,
            )
            self._model.eval()
            self.available = True
            self.checkpoint_path = str(chosen)
            self.model_name = chosen.name
            self.tokenizer_name = getattr(self._tokenizer, "name_or_path", str(chosen))
            logger.info(
                "Chat LLM ready name=%s arch=%s path=%s",
                self.model_name,
                self.architecture,
                self.checkpoint_path,
            )
        except Exception as exc:  # noqa: BLE001
            self.error = f"Failed to load chat LLM: {exc}"
            logger.exception("%s", self.error)
            self._model = None
            self._tokenizer = None

    def generate(self, prompt: str, *, max_new_tokens: int = 512) -> str | None:
        if not self.available or self._model is None or self._tokenizer is None:
            return None
        try:
            import torch

            inputs = self._tokenizer(prompt, return_tensors="pt", truncation=True, max_length=2048)
            with torch.no_grad():
                out = self._model.generate(
                    **inputs,
                    max_new_tokens=max_new_tokens,
                    do_sample=True,
                    temperature=0.7,
                    top_p=0.9,
                    pad_token_id=self._tokenizer.eos_token_id
                    or self._tokenizer.pad_token_id,
                )
            text = self._tokenizer.decode(out[0], skip_special_tokens=True)
            # Strip echoed prompt when present
            if text.startswith(prompt):
                text = text[len(prompt) :].strip()
            return text.strip() or None
        except Exception as exc:  # noqa: BLE001
            self.error = f"Chat generation failed: {exc}"
            logger.exception("%s", self.error)
            return None

    def info(self) -> dict[str, Any]:
        return {
            "available": self.available,
            "model_name": self.model_name,
            "checkpoint_path": self.checkpoint_path,
            "tokenizer": self.tokenizer_name,
            "architecture": self.architecture,
            "error": self.error,
        }


_CHAT: LocalChatModel | None = None


def get_chat_model() -> LocalChatModel:
    global _CHAT
    if _CHAT is None:
        _CHAT = LocalChatModel()
    return _CHAT
