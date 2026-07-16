# -*- coding: utf-8 -*-
"""GRCx conversational assistant.

Pipeline (chat):
  User Question → Chat LLM / Dialogue Engine → Natural Response
  Optional side channel: AraBERT → category / confidence / policy mapping

AraBERT must NEVER replace the LLM/dialogue response for chat intents.
"""
from __future__ import annotations

import logging
import re
from typing import Any

from .chat_model import get_chat_model
from .config import CATEGORY_AR, CATEGORY_EN, SEVERITY_AR, SEVERITY_EN, SEVERITY_MAP
from .dialogue import compose_dialogue_reply
from .knowledge import get_knowledge
from .reporter import detect_lang, smart_layer

logger = logging.getLogger("imtithal.assistant")

_ANALYZE_HINTS = re.compile(
    r"("
    r"\banaly[sz]e\b|\bclassify\b|\breport\b|\bviolation\b|\bclassify this\b|"
    r"حل[ّل]ل|صن[ّف]ف|تقرير|مخالف|تحليل الحالة|حلّل|صنف"
    r")",
    re.I,
)

_GREETING = re.compile(
    r"^(\s*)(hi|hello|hey|مرحبا|السلام|اهلا|أهلا|صباح|مساء)(\s|[!.؟?]|$)",
    re.I,
)

_QUESTION = re.compile(
    r"(\?|؟|\bwhat\b|\bwhy\b|\bhow\b|\bwhen\b|\bwhere\b|\bwho\b|\bwhich\b|"
    r"\bcan you\b|\bexplain\b|\bdefine\b|\btell me\b|\bhelp\b|\bdifference\b|\bvs\b|"
    r"ما\s+هو|ما\s+هي|لماذا|كيف|متى|أين|من\s+هو|اشرح|وضح|عرف|ساعدني|الفرق)",
    re.I,
)


def detect_intent(user_text: str) -> str:
    """Return 'analyze' | 'greet' | 'chat'."""
    t = (user_text or "").strip()
    if not t:
        return "chat"
    if _GREETING.match(t) and len(t) < 40:
        return "greet"
    if _ANALYZE_HINTS.search(t):
        return "analyze"
    if _QUESTION.search(t):
        return "chat"
    # Short descriptive incident narratives without a question → analyze
    if len(t.split()) >= 6:
        return "analyze"
    return "chat"


class ConversationalAssistant:
    """Natural-language GRCx advisor — LLM/dialogue first; AraBERT classify-only."""

    def __init__(self, pipeline) -> None:
        self.pipeline = pipeline
        self.llm = smart_layer()  # optional Ollama/Anthropic enrichment
        self.chat_model = get_chat_model()
        logger.info(
            "Inference pipeline: User → ChatLLM/Dialogue → Response | "
            "optional AraBERT classification. chat_model=%s available=%s path=%s | "
            "ollama/anthropic=%s | arabert_checkpoint=%s",
            self.chat_model.model_name,
            self.chat_model.available,
            self.chat_model.checkpoint_path,
            self.llm.provider,
            getattr(pipeline.classifier, "checkpoint", None),
        )

    def reply(
        self,
        *,
        messages: list[dict[str, str]],
        page_context: dict | None = None,
        user_first_name: str | None = None,
        user_role: str | None = None,
        user_department: str | None = None,
        lang: str = "auto",
        force_analyze: bool = False,
    ) -> dict[str, Any]:
        user_text = ""
        for m in reversed(messages):
            if m.get("role") == "user" and (m.get("content") or "").strip():
                user_text = m["content"].strip()
                break
        if not user_text:
            raise ValueError("Empty prompt")

        if lang not in ("ar", "en"):
            lang = detect_lang(user_text)
        intent = "analyze" if force_analyze else detect_intent(user_text)
        module = (page_context or {}).get("moduleLabel") or ""

        # Optional AraBERT side channel (never authors chat answers)
        predictions = self.pipeline.classifier.predict(user_text, top_k=3)
        top = predictions[0]
        cat = top["category"]
        conf = float(top["confidence"])
        know = get_knowledge(cat, lang)
        severity = SEVERITY_MAP.get(cat, "Medium")
        sev_label = (SEVERITY_EN if lang == "en" else SEVERITY_AR).get(severity, severity)
        cat_title = (
            (CATEGORY_EN if lang == "en" else CATEGORY_AR).get(cat, cat)
        )

        meta = {
            "intent": intent,
            "answer_model": None,
            "answer_checkpoint": None,
            "answer_tokenizer": None,
            "classifier_model": "arabert",
            "classifier_checkpoint": self.pipeline.classifier.checkpoint,
            "classifier_path": getattr(self.pipeline.classifier, "model_path", None)
            or getattr(self.pipeline.classifier, "path", None),
            "classifier_category": cat,
            "classifier_category_title": cat_title,
            "confidence": conf,
            "severity": severity,
            "policy_mapping": [
                {"id": r.get("id"), "title": r.get("title")}
                for r in (know.get("regulations") or [])[:4]
            ],
            "inference_pipeline": (
                "User → ChatLLM/Dialogue → Natural Response; "
                "optional AraBERT → category/confidence/policy"
            ),
            "arabert_replaced_answer": False,
        }

        if intent == "analyze":
            from .reporter import build_report, format_report_text

            report = build_report(
                user_text,
                predictions,
                [],
                engine_info=self.pipeline.engine_info(),
                use_llm=True,
                lang=lang,
            )
            text = format_report_text(report)
            meta["answer_model"] = "violation_report_template+arabert"
            meta["mode_note"] = "analyze path intentionally uses classifier + report template"
            return {
                "reply": text,
                "mode": "analyze_report",
                "language": lang,
                "meta": meta,
                "report": report,
            }

        # ---- Chat path: LLM / dialogue MUST produce the answer ----
        classification_side = {"category": cat, "confidence": conf, "title": cat_title}

        reply = None
        # 1) Developer-trained CausalLM if present
        if self.chat_model.available:
            prompt = self._chat_prompt(
                user_text=user_text,
                lang=lang,
                module=module,
                user_first_name=user_first_name,
                user_role=user_role,
                user_department=user_department,
                messages=messages,
                classification=classification_side,
            )
            reply = self.chat_model.generate(prompt)
            if reply:
                meta["answer_model"] = self.chat_model.model_name
                meta["answer_checkpoint"] = self.chat_model.checkpoint_path
                meta["answer_tokenizer"] = self.chat_model.tokenizer_name
                meta["response_layer"] = "local_causal_llm"

        # 2) Optional Ollama / Anthropic free-text
        if not reply:
            reply = self._ollama_chat(
                user_text=user_text,
                lang=lang,
                module=module,
                user_first_name=user_first_name,
                user_role=user_role,
                user_department=user_department,
                messages=messages,
                classification=classification_side,
            )
            if reply:
                meta["answer_model"] = f"llm:{self.llm.provider}:{getattr(self.llm, 'model', None)}"
                meta["response_layer"] = f"llm:{self.llm.provider}"

        # 3) GRCx dialogue engine (topic-aware natural answers — NOT AraBERT)
        if not reply:
            reply, dmeta = compose_dialogue_reply(
                user_text=user_text,
                lang=lang,
                module=module,
                user_first_name=user_first_name,
                classification=classification_side,
            )
            meta.update(dmeta)
            meta["answer_model"] = "grcx-dialogue-engine"
            meta["answer_checkpoint"] = "imtithal/dialogue.py"
            meta["answer_tokenizer"] = "n/a (rule+knowledge dialogue)"
            meta["response_layer"] = "grcx-dialogue-engine"

        logger.info(
            "chat answer_model=%s classifier=%s conf=%.1f arabert_replaced=%s",
            meta.get("answer_model"),
            cat,
            conf,
            False,
        )

        return {
            "reply": reply,
            "mode": "conversation",
            "language": lang,
            "meta": meta,
            "classification": {
                "model": "arabert",
                "category": cat,
                "confidence": conf,
                "severity": severity,
                "policy_mapping": meta["policy_mapping"],
                "predictions": predictions,
            },
        }

    def _history_snippet(self, messages: list[dict[str, str]], lang: str) -> str:
        lines: list[str] = []
        for m in messages[-6:]:
            role = m.get("role") or "user"
            content = (m.get("content") or "").strip()
            if not content:
                continue
            prefix = "User" if role == "user" else "Assistant"
            if lang == "ar":
                prefix = "المستخدم" if role == "user" else "المساعد"
            lines.append(f"{prefix}: {content[:500]}")
        return "\n".join(lines)

    def _chat_prompt(
        self,
        *,
        user_text: str,
        lang: str,
        module: str,
        user_first_name: str | None,
        user_role: str | None,
        user_department: str | None,
        messages: list[dict[str, str]],
        classification: dict[str, Any],
    ) -> str:
        history = self._history_snippet(messages, lang)
        system = (
            "You are GRCx, a bilingual GRC assistant. Answer conversationally. "
            "Do NOT emit a Violation Analysis Report unless asked to analyze. "
            "AraBERT classification is optional context only — never copy it as the answer."
            if lang == "en"
            else (
                "أنت مساعد GRCx. أجب محادثياً. لا تُخرج تقرير مخالفة إلا إذا طُلب التحليل. "
                "تصنيف AraBERT سياق اختياري فقط — لا تجعله هو الإجابة."
            )
        )
        return (
            f"{system}\n"
            f"Module: {module or 'GRCx'}\n"
            f"User: {user_first_name or '-'} | {user_role or '-'} | {user_department or '-'}\n"
            f"Optional AraBERT hint: {classification}\n"
            f"Conversation:\n{history}\n"
            f"User question: {user_text}\n"
            f"Assistant:"
        )

    def _ollama_chat(
        self,
        *,
        user_text: str,
        lang: str,
        module: str,
        user_first_name: str | None,
        user_role: str | None,
        user_department: str | None,
        messages: list[dict[str, str]],
        classification: dict[str, Any],
    ) -> str | None:
        if self.llm.provider == "none":
            return None
        prompt = self._chat_prompt(
            user_text=user_text,
            lang=lang,
            module=module,
            user_first_name=user_first_name,
            user_role=user_role,
            user_department=user_department,
            messages=messages,
            classification=classification,
        )
        return self.llm.generate_text(prompt)
