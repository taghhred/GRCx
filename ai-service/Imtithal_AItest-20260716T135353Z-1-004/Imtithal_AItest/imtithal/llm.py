# -*- coding: utf-8 -*-
"""تكامل LLM محلي (Ollama) — يعيد للتقرير عمق التحليل الذي كان يوفره الـ API.

- اكتشاف تلقائي: إذا Ollama يعمل على جهازك يُستخدم فوراً بلا أي إعداد.
- اختيار تلقائي لأفضل نموذج مثبّت (ترتيب يفضّل النماذج القوية بالعربية).
- إخراج JSON مضبوط مع تصحيح ذاتي (يتحمل النصوص الزائدة وأسوار الكود).
- Anthropic يبقى خياراً ثانوياً إن وُجد المفتاح — غير مطلوب.

متغيرات اختيارية:
    OLLAMA_URL           (افتراضي http://localhost:11434)
    RAQEEB_OLLAMA_MODEL  (لتثبيت نموذج بعينه بدل الاختيار التلقائي)
    IMTITHAL_NO_LLM=1      (لتعطيل الطبقة الذكية والاكتفاء بالقالب المحلي)
"""
from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434").rstrip("/")

# ترتيب التفضيل — الأعلى أولاً (جودة عربية × حجم معقول)
_MODEL_RANK = [
    "qwen3", "qwen2.5", "command-r7b-arabic", "aya", "gemma3", "gemma2",
    "llama3.3", "llama3.2", "llama3.1", "llama3", "mistral", "phi4", "phi3",
]


def _rank(name: str) -> int:
    n = name.lower()
    for i, fam in enumerate(_MODEL_RANK):
        if fam in n:
            return i
    return len(_MODEL_RANK)


def _http_json(url: str, payload: dict | None = None, timeout: int = 8):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(
        url, data=data,
        headers={"Content-Type": "application/json"},
        method="POST" if data else "GET",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


class OllamaLLM:
    """عميل Ollama خفيف بلا اعتماديات خارجية."""

    def __init__(self):
        self.available = False
        self.model: str | None = None
        self.models: list[str] = []
        self.error: str | None = None
        if (os.environ.get("IMTITHAL_NO_LLM") or os.environ.get("RAQEEB_NO_LLM", "")).strip() in {"1", "true", "yes"}:
            self.error = "معطّل عبر RAQEEB_NO_LLM"
            return
        try:
            tags = _http_json(OLLAMA_URL + "/api/tags", timeout=3)
            self.models = sorted(
                (m.get("name", "") for m in tags.get("models", [])), key=_rank
            )
            forced = (os.environ.get("IMTITHAL_OLLAMA_MODEL") or os.environ.get("RAQEEB_OLLAMA_MODEL", "")).strip()
            if forced:
                self.model = forced
            elif self.models:
                self.model = self.models[0]
            self.available = bool(self.model)
            if not self.available:
                self.error = "Ollama يعمل لكن لا توجد نماذج — نفّذ: ollama pull qwen2.5:7b"
        except Exception as exc:  # noqa: BLE001 — غير مثبت/متوقف
            self.error = f"Ollama غير متاح ({exc.__class__.__name__})"

    def generate(self, prompt: str, timeout: int = 120,
                 num_predict: int = 900, *, json_format: bool = True,
                 temperature: float | None = None) -> str | None:
        if not self.available:
            return None
        try:
            temp = temperature if temperature is not None else (0.35 if not json_format else 0.25)
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "keep_alive": "30m",
                "options": {
                    "temperature": temp,
                    "num_predict": num_predict,
                    "num_ctx": 4096,
                },
            }
            if json_format:
                payload["format"] = "json"
            data = _http_json(
                OLLAMA_URL + "/api/generate",
                payload,
                timeout=timeout,
            )
            return (data.get("response") or "").strip() or None
        except Exception as exc:  # noqa: BLE001
            self.error = f"فشل التوليد: {exc}"
            return None

    def generate_stream_ttft(
        self,
        prompt: str,
        *,
        num_predict: int = 280,
        temperature: float = 0.35,
        timeout: int = 120,
    ) -> tuple[str | None, float, float]:
        """Generate with streaming; return (text, first_token_ms, total_ms)."""
        if not self.available:
            return None, 0.0, 0.0
        import time as _time

        t0 = _time.perf_counter()
        first_ms = 0.0
        chunks: list[str] = []
        try:
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": True,
                "keep_alive": "30m",
                "options": {
                    "temperature": temperature,
                    "num_predict": num_predict,
                    "num_ctx": 4096,
                },
            }
            data = json.dumps(payload).encode()
            req = urllib.request.Request(
                OLLAMA_URL + "/api/generate",
                data=data,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                for raw_line in resp:
                    line = raw_line.decode("utf-8", errors="replace").strip()
                    if not line:
                        continue
                    try:
                        obj = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    piece = obj.get("response") or ""
                    if piece and first_ms <= 0:
                        first_ms = (_time.perf_counter() - t0) * 1000
                    if piece:
                        chunks.append(piece)
                    if obj.get("done"):
                        break
            text = "".join(chunks).strip() or None
            total_ms = (_time.perf_counter() - t0) * 1000
            if first_ms <= 0:
                first_ms = total_ms
            return text, first_ms, total_ms
        except Exception as exc:  # noqa: BLE001
            self.error = f"فشل التوليد: {exc}"
            return None, 0.0, (_time.perf_counter() - t0) * 1000

    def warm(self) -> dict:
        """Keep model resident in memory."""
        if not self.available:
            return {"ok": False, "error": self.error}
        try:
            _http_json(
                OLLAMA_URL + "/api/generate",
                {
                    "model": self.model,
                    "prompt": "ping",
                    "stream": False,
                    "keep_alive": "30m",
                    "options": {"num_predict": 1},
                },
                timeout=60,
            )
            return {"ok": True, "model": self.model}
        except Exception as exc:  # noqa: BLE001
            return {"ok": False, "error": str(exc)}


def parse_llm_json(raw: str) -> dict | None:
    """يستخرج JSON حتى لو أحاطه النموذج بنص أو أسوار ```."""
    if not raw:
        return None
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.M)
    try:
        out = json.loads(raw)
        return out if isinstance(out, dict) else None
    except json.JSONDecodeError:
        pass
    m = re.search(r"\{.*\}", raw, re.S)
    if m:
        try:
            out = json.loads(m.group(0))
            return out if isinstance(out, dict) else None
        except json.JSONDecodeError:
            return None
    return None


class AnthropicLLM:
    """اختياري تماماً — يُستخدم فقط إن وُجد ANTHROPIC_API_KEY ولا يعمل Ollama."""

    def __init__(self):
        self.available = False
        self.model = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-5")
        self.error: str | None = None
        if not os.environ.get("ANTHROPIC_API_KEY"):
            self.error = "لا يوجد ANTHROPIC_API_KEY"
            return
        try:
            import anthropic  # noqa: F401
            self.available = True
        except ImportError:
            self.error = "مكتبة anthropic غير مثبتة"

    def generate(self, prompt: str) -> str | None:
        if not self.available:
            return None
        try:
            import anthropic
            client = anthropic.Anthropic()
            resp = client.messages.create(
                model=self.model, max_tokens=1200,
                messages=[{"role": "user", "content": prompt}],
            )
            return resp.content[0].text.strip()
        except Exception as exc:  # noqa: BLE001
            self.error = f"فشل التوليد: {exc}"
            return None


class SmartLayer:
    """يوحّد الطبقة الذكية: Ollama أولاً ثم Anthropic — أو لا شيء."""

    def __init__(self):
        self.ollama = OllamaLLM()
        self.anthropic = AnthropicLLM()

    @property
    def provider(self) -> str:
        if self.ollama.available:
            return "ollama"
        if self.anthropic.available:
            return "anthropic"
        return "none"

    @property
    def model_name(self) -> str | None:
        if self.ollama.available:
            return self.ollama.model
        if self.anthropic.available:
            return self.anthropic.model
        return None

    def status(self) -> dict:
        return {
            "provider": self.provider,
            "model": self.model_name,
            "ollama_models": self.ollama.models,
            "ollama_error": self.ollama.error,
            "anthropic_error": self.anthropic.error,
        }

    def generate_json(self, prompt: str) -> dict | None:
        raw = None
        if self.ollama.available:
            raw = self.ollama.generate(prompt, json_format=True)
        if raw is None and self.anthropic.available:
            raw = self.anthropic.generate(prompt)
        return parse_llm_json(raw) if raw else None

    def generate_text(self, prompt: str) -> str | None:
        """Free-form conversational generation (no JSON schema)."""
        text, _ = self.generate_text_timed(prompt, max_tokens=320, temperature=0.35)
        return text

    def generate_text_timed(
        self,
        prompt: str,
        *,
        max_tokens: int = 320,
        temperature: float = 0.35,
    ) -> tuple[str | None, dict]:
        detail: dict = {"first_token_ms": 0.0, "total_ms": 0.0}
        if self.ollama.available:
            text, ttft, total = self.ollama.generate_stream_ttft(
                prompt,
                num_predict=max_tokens,
                temperature=temperature,
                timeout=90,
            )
            detail["first_token_ms"] = ttft
            detail["total_ms"] = total
            if text:
                if "Violation Analysis Report" in text or "تقرير تحليل مخالفة" in text:
                    return None, detail
                return text.strip(), detail
        if self.anthropic.available:
            import time as _time

            t0 = _time.perf_counter()
            raw = self.anthropic.generate(prompt)
            elapsed = (_time.perf_counter() - t0) * 1000
            detail["first_token_ms"] = elapsed
            detail["total_ms"] = elapsed
            if raw and "Violation Analysis Report" not in raw:
                return raw.strip(), detail
        return None, detail

    def warm(self) -> dict:
        if self.ollama.available:
            return self.ollama.warm()
        return {"ok": False, "error": "no ollama"}
