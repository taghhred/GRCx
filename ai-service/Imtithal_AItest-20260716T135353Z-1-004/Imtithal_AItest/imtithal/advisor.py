# -*- coding: utf-8 -*-
"""GRCx production advisor — routed, timed, singleton-backed, LLM-first.

Routes:
  A greeting          → LLM micro-prompt (no AraBERT / no retrieval)
  B general cyber     → LLM only
  C regulatory        → AraBERT + retrieval + LLM
  D incident          → AraBERT + retrieval + LLM
  E platform/context  → page context + LLM (+ light AraBERT if risk-like)

No static answer templates. No per-request model reload.
"""
from __future__ import annotations

import hashlib
import logging
import re
import time
from typing import Any

from .config import CATEGORY_AR, CATEGORY_EN
from .knowledge import get_knowledge
from .pipeline import ImtithalPipeline
from .reporter import smart_layer
from .retriever import LegalRetriever, load_articles

logger = logging.getLogger("imtithal.advisor")

_MAX_MESSAGE = 4000
_MAX_HISTORY_TURNS = 4  # recent window only
_HISTORY_CHARS = 400
_PASSAGE_CHARS = 280
_TOP_K = 4
_RETRIEVE_CACHE_SIZE = 128

_AR_CHARS = re.compile(r"[\u0600-\u06FF]")
_LATIN_CHARS = re.compile(r"[A-Za-z]")

_OUT_OF_SCOPE = re.compile(
    r"("
    r"\b(write|generate|debug)\b.{0,20}\b(python|javascript|java|code|script|program)\b|"
    r"\bpython\b.{0,20}\b(script|code)\b|"
    r"\brecipe\b|\bjoke\b|\bpoem\b|\bweather\b|"
    r"اكتب\s+لي\s+كود|سكربت\s+بايثون|برنامج\s+بايثون|نكتة|قصيدة|الطقس"
    r")",
    re.I,
)

_GREETING = re.compile(
    r"^[\s]*(?:"
    r"hi|hello|hey|howdy|good\s*(?:morning|afternoon|evening)|"
    r"thanks|thank\s*you|thx|bye|goodbye|see\s*you|"
    r"how\s+are\s+you|what'?s\s+up|"
    r"مرحبا|السلام\s*عليكم|اهلا|أهلا|صباح\s*الخير|مساء\s*الخير|"
    r"شكرا|شكراً|مع\s*السلامة|كيفك|كيف\s*حالك"
    r")[\s!.؟?]*$",
    re.I,
)

_REGULATORY = re.compile(
    r"("
    r"\bNCA\b|\bECC\b|\bSAMA\b|\bCSF\b|\bPDPL\b|\bNIST\b|\bISO\b|\bPCI\b|"
    r"according\s+to|pursuant\s+to|framework|control\s*(?:id|number)|"
    r"comply|compliance|identity\s+management\s+control|"
    r"وفق|بحسب|حسب\s+ضوابط|متطلبات\s+|الامتثال|"
    r"password\s+policy|سياسة\s+كلمات?\s*المرور"
    r")",
    re.I,
)

_INCIDENT = re.compile(
    r"("
    r"left\s+(?:the\s+)?(?:company|org)|still\s+(?:has\s+)?access|account\s+remains|"
    r"suspicious|shared\s+credential|without\s+mfa|weak\s+password|"
    r"assess\s+the\s+risk|incident|breach|compromis|"
    r"موظف\s+غادر|حساب\s+ما\s*زال|سلوك\s+مشبوه|قيّم|قيم\s+المخاطر|مخالف"
    r")",
    re.I,
)

_PLATFORM = re.compile(
    r"("
    r"\bthis\s+dashboard\b|\bthis\s+page\b|\bthis\s+risk\b|\bcurrent\s+(?:page|module|screen)\b|"
    r"explain\s+this|why\s+is\s+this\s+risk|selected\s+case|"
    r"هذه\s+الواجهة|هذه\s+اللوحة|هذا\s+المخاطر|الصفحة\s+الحالية"
    r")",
    re.I,
)

_GENERAL_CYBER = re.compile(
    r"("
    r"\bwhat\s+is\b|\bexplain\b|\bdefine\b|\bdifference\s+between\b|"
    r"\bIAM\b|\bPAM\b|\bMFA\b|\bRBAC\b|\bABAC\b|\bSOAR\b|\bSIEM\b|"
    r"ما\s+هو|ما\s+هي|اشرح|عرف|الفرق"
    r")",
    re.I,
)

# In-memory article corpus (loaded once)
_ARTICLES_CACHE: list[dict] | None = None
_ARTICLES_BLOB: list[str] | None = None
_QUERY_CACHE: dict[str, tuple[float, list[dict]]] = {}
_QUERY_CACHE_TTL = 300.0  # seconds


def detect_reply_lang(text: str) -> str:
    ar = len(_AR_CHARS.findall(text or ""))
    en = len(_LATIN_CHARS.findall(text or ""))
    return "ar" if ar > en else "en"


def detect_route(message: str, page_context: dict | None = None) -> str:
    t = (message or "").strip()
    if _GREETING.match(t) and len(t) < 48:
        return "A"
    if _PLATFORM.search(t):
        return "E"
    if page_context and any(
        page_context.get(k)
        for k in ("selectedRiskId", "selectedCaseId", "entityTitle")
    ):
        if re.search(r"\bthis\b|selected|current|هذا|هذه|explain\s+that", t, re.I):
            return "E"
    if _REGULATORY.search(t):
        return "C"
    if _INCIDENT.search(t) and (
        len(t.split()) >= 6
        or re.search(r"\bassess\b|\brisk\b|قيّم|مخاطر", t, re.I)
    ):
        return "D"
    if _GENERAL_CYBER.search(t) or len(t.split()) <= 12:
        return "B"
    if len(t.split()) >= 10:
        return "D"
    return "B"


def _articles_index() -> tuple[list[dict], list[str]]:
    global _ARTICLES_CACHE, _ARTICLES_BLOB
    if _ARTICLES_CACHE is None:
        t0 = time.perf_counter()
        arts = load_articles()
        blobs = [
            " ".join(
                str(a.get(k) or "")
                for k in ("id", "title", "text", "source", "category", "pdf_path")
            ).lower()
            for a in arts
        ]
        _ARTICLES_CACHE = arts
        _ARTICLES_BLOB = blobs
        logger.info(
            "Article index loaded once count=%s ms=%.0f",
            len(arts),
            (time.perf_counter() - t0) * 1000,
        )
    return _ARTICLES_CACHE, _ARTICLES_BLOB  # type: ignore[return-value]


def _framework_filter_terms(query: str) -> list[str] | None:
    q = query.lower()
    terms: list[str] = []
    if "nca" in q or "ecc" in q:
        terms.extend(["nca", "ecc"])
    if "sama" in q or "csf" in q:
        terms.extend(["sama", "csf"])
    if "pdpl" in q or "sdaia" in q:
        terms.extend(["pdpl", "sdaia"])
    if "nist" in q:
        terms.append("nist")
    if "iso" in q:
        terms.append("iso")
    if "pci" in q:
        terms.append("pci")
    return terms or None


def _tokenize(query: str) -> set[str]:
    stop = {
        "the", "and", "for", "with", "what", "how", "are", "according", "to",
        "a", "an", "of", "in", "on", "is", "this", "that",
    }
    return {
        t
        for t in re.findall(r"[\w\u0600-\u06FF]{2,}", (query or "").lower())
        if len(t) >= 2 and t not in stop
    }


def keyword_retrieve(query: str, top_k: int = _TOP_K) -> list[dict]:
    """RAM keyword retrieval over cached corpus (no disk reload)."""
    cache_key = hashlib.sha1(f"{query}|{top_k}".encode()).hexdigest()
    now = time.time()
    hit = _QUERY_CACHE.get(cache_key)
    if hit and now - hit[0] < _QUERY_CACHE_TTL:
        return [dict(x) for x in hit[1]]

    arts, blobs = _articles_index()
    terms = _tokenize(query)
    if not terms:
        return []
    fw = _framework_filter_terms(query)
    scored: list[tuple[float, int]] = []
    for i, blob in enumerate(blobs):
        if fw and not any(f in blob for f in fw):
            continue
        hits = sum(1 for t in terms if t in blob)
        if hits == 0:
            continue
        priority = float(arts[i].get("priority") or 1.0)
        scored.append((hits * priority, i))
    scored.sort(key=lambda x: x[0], reverse=True)

    out: list[dict] = []
    seen_ids: set[str] = set()
    for score, i in scored:
        art = arts[i]
        pid = str(art.get("id") or "")
        if pid in seen_ids:
            continue
        seen_ids.add(pid)
        text = re.sub(r"\s+", " ", (art.get("text") or "")).strip()[:_PASSAGE_CHARS]
        out.append(
            {
                "id": pid,
                "title": art.get("title") or pid,
                "text": text,
                "similarity": round(min(score * 10, 99), 1),
                "source": art.get("source", ""),
            }
        )
        if len(out) >= top_k:
            break

    if len(_QUERY_CACHE) > _RETRIEVE_CACHE_SIZE:
        _QUERY_CACHE.clear()
    _QUERY_CACHE[cache_key] = (now, out)
    return [dict(x) for x in out]


def _cap_history(history: list[dict[str, str]] | None) -> list[dict[str, str]]:
    if not history:
        return []
    cleaned: list[dict[str, str]] = []
    for turn in history:
        role = (turn.get("role") or "").strip().lower()
        content = (turn.get("content") or "").strip()
        if role not in {"user", "assistant"} or not content:
            continue
        cleaned.append({"role": role, "content": content[:_HISTORY_CHARS]})
    return cleaned[-_MAX_HISTORY_TURNS * 2 :]


def _history_text(history: list[dict[str, str]], lang: str) -> str:
    if not history:
        return ""
    lines = []
    for turn in history:
        if lang == "ar":
            prefix = "المستخدم" if turn["role"] == "user" else "المساعد"
        else:
            prefix = "User" if turn["role"] == "user" else "Assistant"
        lines.append(f"{prefix}: {turn['content']}")
    return "\n".join(lines)


def _system_core(lang: str, module: str | None) -> str:
    mod = module or "GRCx"
    if lang == "ar":
        return (
            f"أنت مستشار GRCx للحوكمة والمخاطر والامتثال (الوحدة: {mod}). "
            "أجب بالعربية فقط، باختصار واحترافية، بنقاط عند الحاجة. "
            "لا تخترع أرقام ضوابط. لا تكرر مقدمات ترحيبية. "
            "الإرشاد استشاري — النص الرسمي للجهة المنظمة هو المرجع الملزم."
        )
    return (
        f"You are the GRCx GRC advisor (module: {mod}). "
        "Reply in professional English only — concise, enterprise tone, bullets when useful. "
        "Never invent control IDs. Do not dump raw legal passages; summarize and cite IDs. "
        "Advisory only — official regulator text is binding. No greeting boilerplate."
    )


class ChatAdvisor:
    """Production routed advisor (singleton via get_advisor)."""

    def __init__(self, pipeline: ImtithalPipeline | None = None) -> None:
        self.pipeline = pipeline or ImtithalPipeline()
        self.retriever = self.pipeline.retriever
        self.llm = smart_layer()
        # Warm article index once at construction
        _articles_index()
        logger.info(
            "ChatAdvisor ready llm=%s:%s arabert=%s articles=%s",
            self.llm.provider,
            self.llm.model_name,
            self.pipeline.classifier.backend_name,
            len(_ARTICLES_CACHE or []),
        )

    def answer(
        self,
        message: str,
        history: list[dict[str, str]] | None = None,
        module: str | None = None,
        lang: str = "auto",
        page_context: dict | None = None,
    ) -> dict[str, Any]:
        timings: dict[str, float] = {}
        t_all = time.perf_counter()
        timings["request_received"] = 0.0

        raw = (message or "").strip()
        if not raw:
            return self._pack(
                "Please enter a question.",
                [],
                False,
                False,
                None,
                "none",
                "en",
                timings,
                error="empty_message",
            )
        if len(raw) > _MAX_MESSAGE:
            raw = raw[:_MAX_MESSAGE]

        t0 = time.perf_counter()
        if lang not in ("ar", "en"):
            lang = detect_reply_lang(raw)
        else:
            detected = detect_reply_lang(raw)
            if detected != lang:
                lang = detected
        timings["language_ms"] = (time.perf_counter() - t0) * 1000

        t0 = time.perf_counter()
        route = detect_route(raw, page_context)
        timings["intent_ms"] = (time.perf_counter() - t0) * 1000

        hist = _cap_history(history)
        pc = page_context or {}
        mod = module or pc.get("moduleLabel") or "GRCx"

        if _OUT_OF_SCOPE.search(raw):
            reply = (
                "I only advise on governance, risk, and compliance topics. Please ask a GRC-related question."
                if lang == "en"
                else "أنا مستشار حوكمة ومخاطر وامتثال فقط. يرجى طرح سؤال متعلق بالحوكمة."
            )
            timings["total_ms"] = (time.perf_counter() - t_all) * 1000
            return self._pack(
                reply, [], False, True, self.llm.model_name, route, lang, timings
            )

        # ---- Route A: greeting (LLM micro, no AraBERT/retrieval) ----
        if route == "A":
            return self._route_greeting(raw, lang, mod, hist, timings, t_all)

        # ---- Route B: general cyber (LLM only) ----
        if route == "B":
            return self._route_llm_only(
                raw, lang, mod, hist, timings, t_all, route="B", max_tokens=280
            )

        # ---- Route E: platform context ----
        if route == "E":
            return self._route_platform(raw, lang, mod, hist, pc, timings, t_all)

        # ---- Routes C / D: AraBERT + retrieval + LLM ----
        return self._route_grounded(
            raw, lang, mod, hist, timings, t_all, route=route
        )

    def _route_greeting(
        self,
        raw: str,
        lang: str,
        module: str,
        hist: list[dict[str, str]],
        timings: dict[str, float],
        t_all: float,
    ) -> dict[str, Any]:
        timings["arabert_ms"] = 0.0
        timings["retriever_ms"] = 0.0
        t0 = time.perf_counter()
        if lang == "ar":
            prompt = (
                f"أنت مستشار GRCx في وحدة {module}. "
                f"المستخدم قال: «{raw}». "
                "رد ترحيبي قصير (جملة أو جملتين) بالعربية، طبيعي ومهني، "
                "بدون قائمة قدرات وبدون تكرار نفس المقدمة."
            )
        else:
            prompt = (
                f"You are the GRCx advisor on {module}. "
                f"User said: \"{raw}\". "
                "Reply with a brief natural greeting (1–2 sentences) in English. "
                "Be professional. Do not list capabilities. Do not use a canned intro."
            )
        timings["prompt_ms"] = (time.perf_counter() - t0) * 1000
        reply, llm_meta = self._llm_generate(prompt, max_tokens=64, temperature=0.5)
        timings.update(llm_meta)
        timings["total_ms"] = (time.perf_counter() - t_all) * 1000
        if not reply:
            return self._llm_unavailable(lang, "A", timings)
        return self._pack(
            reply.strip(),
            [],
            False,
            False,
            f"{self.llm.provider}:{self.llm.model_name}",
            "A",
            lang,
            timings,
        )

    def _route_llm_only(
        self,
        raw: str,
        lang: str,
        module: str,
        hist: list[dict[str, str]],
        timings: dict[str, float],
        t_all: float,
        *,
        route: str,
        max_tokens: int,
    ) -> dict[str, Any]:
        timings["arabert_ms"] = 0.0
        timings["retriever_ms"] = 0.0
        t0 = time.perf_counter()
        hist_txt = _history_text(hist, lang)
        sys = _system_core(lang, module)
        prompt = (
            f"{sys}\n\n"
            f"{('Conversation:\n' + hist_txt + '\n\n') if hist_txt else ''}"
            f"{'سؤال:' if lang == 'ar' else 'Question:'} {raw}\n\n"
            f"{'أجب مباشرة وبإيجاز.' if lang == 'ar' else 'Answer directly and concisely.'}"
        )
        timings["prompt_ms"] = (time.perf_counter() - t0) * 1000
        reply, llm_meta = self._llm_generate(
            prompt, max_tokens=max_tokens, temperature=0.35
        )
        timings.update(llm_meta)
        timings["total_ms"] = (time.perf_counter() - t_all) * 1000
        if not reply:
            return self._llm_unavailable(lang, route, timings)
        return self._pack(
            reply.strip(),
            [],
            False,
            False,
            f"{self.llm.provider}:{self.llm.model_name}",
            route,
            lang,
            timings,
        )

    def _route_platform(
        self,
        raw: str,
        lang: str,
        module: str,
        hist: list[dict[str, str]],
        pc: dict,
        timings: dict[str, float],
        t_all: float,
    ) -> dict[str, Any]:
        timings["retriever_ms"] = 0.0
        timings["arabert_ms"] = 0.0
        ctx_bits = [
            f"module={module}",
            f"pathname={pc.get('pathname') or ''}",
            f"case={pc.get('selectedCaseId') or ''}",
            f"risk={pc.get('selectedRiskId') or ''}",
            f"framework={pc.get('selectedFramework') or ''}",
            f"entity={pc.get('entityTitle') or ''}",
            f"auditor={pc.get('assignedAuditor') or ''}",
        ]
        context_block = "; ".join(b for b in ctx_bits if not b.endswith("="))
        t0 = time.perf_counter()
        hist_txt = _history_text(hist, lang)
        sys = _system_core(lang, module)
        prompt = (
            f"{sys}\n"
            f"Page context: {context_block}\n\n"
            f"{('Conversation:\n' + hist_txt + '\n\n') if hist_txt else ''}"
            f"Question: {raw}\n\n"
            "Explain using the page context. If context is thin, say what is missing "
            "and give general GRC guidance. Be concise."
            if lang == "en"
            else (
                f"{sys}\n"
                f"سياق الصفحة: {context_block}\n\n"
                f"{('المحادثة:\n' + hist_txt + '\n\n') if hist_txt else ''}"
                f"السؤال: {raw}\n\n"
                "اشرح باستخدام سياق الصفحة. إن كان السياق ناقصاً وضّح ذلك بإيجاز."
            )
        )
        timings["prompt_ms"] = (time.perf_counter() - t0) * 1000
        reply, llm_meta = self._llm_generate(prompt, max_tokens=320, temperature=0.3)
        timings.update(llm_meta)
        timings["total_ms"] = (time.perf_counter() - t_all) * 1000
        if not reply:
            return self._llm_unavailable(lang, "E", timings)
        return self._pack(
            reply.strip(),
            [],
            False,
            False,
            f"{self.llm.provider}:{self.llm.model_name}",
            "E",
            lang,
            timings,
        )

    def _route_grounded(
        self,
        raw: str,
        lang: str,
        module: str,
        hist: list[dict[str, str]],
        timings: dict[str, float],
        t_all: float,
        *,
        route: str,
    ) -> dict[str, Any]:
        # AraBERT classification (singleton model) — always for C/D
        t0 = time.perf_counter()
        cat = ""
        conf = 0.0
        try:
            preds = self.pipeline.classifier.predict(raw, top_k=3)
            cat = preds[0]["category"]
            conf = float(preds[0]["confidence"])
        except Exception as exc:  # noqa: BLE001
            logger.warning("AraBERT predict failed: %s", exc)
        timings["arabert_ms"] = (time.perf_counter() - t0) * 1000

        # Topic hint enriches knowledge (does not replace AraBERT label)
        hint = None
        for pattern, hcat in (
            (re.compile(r"password|كلمة\s*المرور", re.I), "WEAK_PASSWORD"),
            (re.compile(r"\bMFA\b|multi[- ]?factor|التحقق\s*المتعدد", re.I), "MFA_MISSING"),
            (re.compile(r"\bPAM\b|privileged|حسابات?\s*مميز", re.I), "PAM"),
            (re.compile(r"stale|left|leaver|مغادر|حساب\s*خامل", re.I), "STALE_ACCOUNT"),
        ):
            if pattern.search(raw):
                hint = hcat
                break
        know_cat = hint or cat
        know = get_knowledge(know_cat, lang) if know_cat else {}
        title = (
            (know.get("title_ar") if lang == "ar" else know.get("title"))
            or (CATEGORY_AR if lang == "ar" else CATEGORY_EN).get(know_cat, know_cat)
        )
        regs = know.get("regulations") or []
        know_snip = (
            f"AraBERT top label: {cat} ({conf:.0f}%)\n"
            f"Knowledge focus: {know_cat} — {title}\n"
            f"{(know.get('explain') or '')[:500]}\n"
            "Controls: "
            + "; ".join(f"{r.get('id')}: {r.get('title')}" for r in regs[:3])
        )

        # Retrieval (RAM index only; ML retriever may return [])
        t0 = time.perf_counter()
        passages = self.retriever.search(raw, top_k=_TOP_K) or []
        if not passages:
            passages = keyword_retrieve(raw, top_k=_TOP_K)
        timings["retriever_ms"] = (time.perf_counter() - t0) * 1000

        sources = []
        seen: set[str] = set()
        for p in passages:
            pid = (p.get("id") or "").strip()
            if pid and pid not in seen:
                seen.add(pid)
                sources.append({"id": pid, "title": (p.get("title") or pid)[:120]})

        t0 = time.perf_counter()
        hist_txt = _history_text(hist, lang)
        pass_lines = []
        for i, p in enumerate(passages[:_TOP_K], 1):
            pass_lines.append(
                f"[{i}] {p.get('id')}: {(p.get('text') or '')[:_PASSAGE_CHARS]}"
            )
        passages_txt = "\n".join(pass_lines) or "(none)"
        sys = _system_core(lang, module)
        if lang == "ar":
            prompt = (
                f"{sys}\n\n"
                f"تصنيف AraBERT:\n{know_snip}\n\n"
                f"مقاطع مرجعية (لخّص ولا تنسخ حرفياً):\n{passages_txt}\n\n"
                f"{('المحادثة:\n' + hist_txt + '\n\n') if hist_txt else ''}"
                f"السؤال: {raw}\n\n"
                "أجب بإيجاز: شرح، نقاط عملية، واستشهد بمعرفات المواد عند الحاجة."
            )
        else:
            prompt = (
                f"{sys}\n\n"
                f"AraBERT classification:\n{know_snip}\n\n"
                f"Reference passages (summarize — do not dump verbatim):\n{passages_txt}\n\n"
                f"{('Conversation:\n' + hist_txt + '\n\n') if hist_txt else ''}"
                f"Question: {raw}\n\n"
                "Answer concisely: explain, use bullets for actions, cite article IDs."
            )
        timings["prompt_ms"] = (time.perf_counter() - t0) * 1000

        max_tokens = 420 if route == "D" else 360
        reply, llm_meta = self._llm_generate(
            prompt, max_tokens=max_tokens, temperature=0.3
        )
        timings.update(llm_meta)
        timings["total_ms"] = (time.perf_counter() - t_all) * 1000
        if not reply:
            return self._llm_unavailable(lang, route, timings)

        return self._pack(
            reply.strip(),
            sources,
            bool(sources or cat),
            False,
            f"{self.llm.provider}:{self.llm.model_name}",
            route,
            lang,
            timings,
            classifier={"category": cat, "confidence": conf} if cat else None,
        )

    def _llm_generate(
        self, prompt: str, *, max_tokens: int, temperature: float
    ) -> tuple[str | None, dict[str, float]]:
        meta: dict[str, float] = {
            "llm_first_token_ms": 0.0,
            "llm_total_ms": 0.0,
        }
        if self.llm.provider == "none":
            return None, meta
        t0 = time.perf_counter()
        # Prefer timed path on SmartLayer
        if hasattr(self.llm, "generate_text_timed"):
            text, detail = self.llm.generate_text_timed(
                prompt,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            meta["llm_first_token_ms"] = float(detail.get("first_token_ms") or 0)
            meta["llm_total_ms"] = float(detail.get("total_ms") or 0)
            return text, meta
        text = self.llm.generate_text(prompt)
        meta["llm_total_ms"] = (time.perf_counter() - t0) * 1000
        meta["llm_first_token_ms"] = meta["llm_total_ms"]
        return text, meta

    def _llm_unavailable(
        self, lang: str, route: str, timings: dict[str, float]
    ) -> dict[str, Any]:
        msg = (
            "The language model is temporarily unavailable. Please try again shortly."
            if lang == "en"
            else "نموذج اللغة غير متاح حالياً. يرجى المحاولة بعد لحظات."
        )
        return self._pack(
            msg, [], False, False, None, route, lang, timings, error="llm_unavailable"
        )

    @staticmethod
    def _pack(
        reply: str,
        sources: list,
        grounded: bool,
        refused: bool,
        model: str | None,
        route: str,
        lang: str,
        timings: dict[str, float],
        *,
        error: str | None = None,
        classifier: dict | None = None,
    ) -> dict[str, Any]:
        out: dict[str, Any] = {
            "reply": reply,
            "sources": sources,
            "grounded": grounded,
            "refused": refused,
            "model": model,
            "route": route,
            "language": lang,
            "timings": {k: round(v, 1) for k, v in timings.items()},
            "classifier": classifier,
        }
        if error:
            out["error"] = error
        logger.info(
            "advisor route=%s lang=%s model=%s total_ms=%.0f arabert_ms=%.0f "
            "retriever_ms=%.0f llm_ms=%.0f ttft_ms=%.0f",
            route,
            lang,
            model,
            timings.get("total_ms", 0),
            timings.get("arabert_ms", 0),
            timings.get("retriever_ms", 0),
            timings.get("llm_total_ms", 0),
            timings.get("llm_first_token_ms", 0),
        )
        return out


_ADVISOR: ChatAdvisor | None = None


def get_advisor(pipeline: ImtithalPipeline | None = None) -> ChatAdvisor:
    global _ADVISOR
    if _ADVISOR is None:
        _ADVISOR = ChatAdvisor(pipeline)
    return _ADVISOR


def warm_advisor_resources(pipeline: ImtithalPipeline | None = None) -> dict[str, Any]:
    """Startup warm: article index + Ollama keep-alive ping."""
    adv = get_advisor(pipeline)
    _articles_index()
    warm: dict[str, Any] = {"articles": len(_ARTICLES_CACHE or [])}
    if adv.llm.provider == "ollama" and hasattr(adv.llm, "warm"):
        warm["ollama"] = adv.llm.warm()
    return warm
