# -*- coding: utf-8 -*-
"""الطبقة 3 — التقرير المفصّل ثنائي اللغة (عربي/إنجليزي، كشف تلقائي).

- قاعدة المعرفة تعطي الأساس الموثوق بكلتا اللغتين.
- Ollama (إن وُجد) يضيف تحليلاً مخصصاً للسيناريو بلغة التقرير المطلوبة.
- lang: "ar" | "en" | "auto"  (auto = حسب لغة النص المُدخل)

ملاحظة توافق: حقول العرض title_ar / category_ar / severity_ar تحمل النص
"بلغة التقرير" أياً كانت — أبقينا أسماءها كما هي كي لا تنكسر الواجهات.
"""
from __future__ import annotations

import re

from .config import (CATEGORY_AR, CATEGORY_EN, SEVERITY_AR, SEVERITY_EN,
                     SEVERITY_MAP)
from .knowledge import get_knowledge
from .llm import SmartLayer

_SMART: SmartLayer | None = None


def smart_layer() -> SmartLayer:
    global _SMART
    if _SMART is None:
        _SMART = SmartLayer()
    return _SMART


# ─────────────────────────── اللغة ───────────────────────────

_AR_CHARS = re.compile(r"[\u0600-\u06FF]")
_LATIN = re.compile(r"[A-Za-z]")


def detect_lang(text: str) -> str:
    ar = len(_AR_CHARS.findall(text))
    en = len(_LATIN.findall(text))
    return "en" if en > ar else "ar"


L10N = {
    "ar": {
        "header": "🛡️  امتثال — تقرير تحليل مخالفة (محلي)",
        "input": "المدخل", "cls": "التصنيف", "conf": "الثقة", "alts": "بدائل",
        "sev": "الخطورة", "summary": "📝 الملخص:",
        "scen": "🔬 تحليل السيناريو:", "root": "↳ السبب الجذري: ",
        "atk": "🎯 سيناريو استغلال محتمل:", "impact": "💥 الأثر على الأعمال:",
        "regs": "📚 الضوابط والأنظمة ذات الصلة:",
        "arts": "🔎 أقرب المقاطع من قاعدة المعرفة (PDFs):",
        "fines": "⚖️ الغرامات/التبعات المحتملة:",
        "now": "🚨 إجراءات فورية:", "long": "🏗️ إجراءات طويلة المدى:",
        "tools": "🧰 أدوات موصى بها: ", "cost": "💰 تقدير التكلفة: ",
        "deadline": "⏱️ مهلة المعالجة: ", "kpis": "📈 مؤشرات المتابعة:",
        "engine": "المحرك: تصنيف={c} | بحث={r} | تقرير={l}{m}",
        "disclaimer": ("تقرير آلي استرشادي من منصة امتثال — يُراجع النص الرسمي "
                       "للأنظمة واللوائح قبل اتخاذ أي إجراء نظامي."),
        "lead": "صُنّفت الحالة على أنها «{t}» بثقة {c:.1f}٪ وبدرجة خطورة {s}.",
        "facts": " أبرز معالم السيناريو: {f}.",
        "refs": " أقرب المراجع: {n}.",
        "f_num": "كمية/عدد: ", "f_time": "توقيت لافت: ", "f_sys": "نظام متأثر: ",
    },
    "en": {
        "header": "🛡️  Imtithal — Violation Analysis Report (local)",
        "input": "Input", "cls": "Class", "conf": "Confidence", "alts": "Others",
        "sev": "Severity", "summary": "📝 Summary:",
        "scen": "🔬 Scenario analysis:", "root": "↳ Likely root cause: ",
        "atk": "🎯 Plausible exploitation scenario:", "impact": "💥 Business impact:",
        "regs": "📚 Applicable controls & regulations:",
        "arts": "🔎 Closest passages from the knowledge base (PDFs):",
        "fines": "⚖️ Potential fines / consequences:",
        "now": "🚨 Immediate actions:", "long": "🏗️ Long-term actions:",
        "tools": "🧰 Recommended tools: ", "cost": "💰 Estimated cost: ",
        "deadline": "⏱️ Remediation deadline: ", "kpis": "📈 Follow-up KPIs:",
        "engine": "Engine: classify={c} | retrieve={r} | report={l}{m}",
        "disclaimer": ("Automated advisory report by Imtithal — always verify "
                       "against the official regulatory texts before any "
                       "formal action."),
        "lead": "The case is classified as \u201c{t}\u201d with {c:.1f}% confidence and {s} severity.",
        "facts": " Key scenario facts: {f}.",
        "refs": " Closest references: {n}.",
        "f_num": "Quantity: ", "f_time": "Notable timing: ", "f_sys": "Affected system: ",
    },
}


# ───────── استخراج معالم السيناريو (ثنائي اللغة) ─────────

_NUM = re.compile(
    r"\b(\d[\d,\.]*)\s*(حساب|مستخدم|موظف|جيجا|ريال|يوم|شهر|ساعة|دقيقة|محاول"
    r"|GB|TB|MB|accounts?|users?|employees?|days?|months?|hours?|minutes?"
    r"|attempts?|SAR|records?)", re.I)
_TIME = re.compile(
    r"(الساعة\s*\d{1,2}|منتصف الليل|فجر|الفجر|خارج الدوام|عطلة"
    r"|\b\d{1,2}\s*(?:AM|PM)\b|midnight|after[- ]hours|weekend|3\s*a\.?m)", re.I)
_SYS = re.compile(
    r"(VPN|نظام الدفع|payment system|قاعدة بيانات|قواعد البيانات|database"
    r"|الموارد البشرية|HR system|الإنتاج|production|core banking|SWIFT|ERP"
    r"|Active Directory|\bAD\b|البريد|email|السحاب\w*|cloud|الخزينة|treasury"
    r"|الصراف|ATM)", re.I)


def extract_scenario_facts(text: str, lang: str = "ar") -> list[str]:
    t = L10N[lang]
    facts: list[str] = []
    for m in _NUM.finditer(text):
        facts.append(f"{t['f_num']}{m.group(1)} {m.group(2)}")
    for m in _TIME.finditer(text):
        facts.append(f"{t['f_time']}{m.group(1)}")
    seen: set[str] = set()
    for m in _SYS.finditer(text):
        s = m.group(1)
        if s.lower() not in seen:
            seen.add(s.lower())
            facts.append(f"{t['f_sys']}{s}")
    return facts[:6]


def _sev_label(sev: str, lang: str) -> str:
    return (SEVERITY_EN if lang == "en" else SEVERITY_AR).get(sev, sev)


def _local_summary(top: dict, know: dict, articles: list[dict],
                   facts: list[str], lang: str) -> str:
    t = L10N[lang]
    sev = SEVERITY_MAP.get(top["category"], "Medium")
    lead = t["lead"].format(t=know.get("title_ar", top["category"]),
                            c=top["confidence"], s=_sev_label(sev, lang))
    fact_txt = t["facts"].format(f="; ".join(facts)) if facts else ""
    cite = ""
    strong = [a for a in articles if a.get("similarity", 0) >= 15][:2]
    if strong:
        names = "، ".join(f"{a['id']} ({a['source']})" if a.get("source")
                          else a["id"] for a in strong)
        cite = t["refs"].format(n=names)
    return f"{lead}{fact_txt} {know.get('explain', '')}{cite}"


# ───────────────────── الطبقة الذكية (Ollama/API) ─────────────────────

_SCHEMA = """{
  "summary": "...", "scenario_analysis": "...", "business_impact": "...",
  "immediate_actions": ["..."], "long_term_actions": ["..."],
  "root_cause": "...", "attack_scenario": "..."
}"""

_PROMPT = {
    "ar": ("أنت خبير امتثال وأمن سيبراني سعودي أول (SAMA / NCA / SDAIA PDPL).\n\n"
           "المخالفة المرصودة:\n{text}\n\n"
           "تصنيف النظام: {title} — ثقة {conf:.0f}٪\n"
           "الضوابط المرتبطة:\n{regs}\n"
           "مقاطع من قاعدة المعرفة:\n{arts}\n\n"
           "حلّل هذه الحالة تحديداً (لا كلام عام). أرجع JSON فقط بلا أي نص خارجه، "
           "بهذه المفاتيح حرفياً وبقيم عربية فصيحة:\n"
           "summary (ملخص 3-4 جمل)، scenario_analysis (تحليل تقني 3-5 جمل)، "
           "business_impact، immediate_actions (3-5 خطوات مرتبطة بالحالة)، "
           "long_term_actions (3-4)، root_cause (جملة)، attack_scenario (جملتان).\n"
           "الهيكل: {schema}"),
    "en": ("You are a senior Saudi cybersecurity & compliance expert "
           "(SAMA / NCA / SDAIA PDPL).\n\n"
           "Observed violation:\n{text}\n\n"
           "System classification: {title} — {conf:.0f}% confidence\n"
           "Related controls:\n{regs}\n"
           "Knowledge-base passages:\n{arts}\n\n"
           "Analyze THIS specific case (no generic advice). Return ONLY valid "
           "JSON with exactly these keys, values in professional English:\n"
           "summary (3-4 sentences), scenario_analysis (3-5 technical "
           "sentences), business_impact, immediate_actions (3-5 case-specific "
           "steps), long_term_actions (3-4), root_cause (one sentence), "
           "attack_scenario (two sentences).\n"
           "Schema: {schema}"),
}


def _llm_enrich(text: str, top: dict, know: dict, articles: list[dict],
                lang: str) -> dict | None:
    layer = smart_layer()
    if layer.provider == "none":
        return None
    arts = "\n".join(f"- {a['id']} ({a.get('source','')}): {a['text'][:180]}"
                     for a in articles[:3])
    regs = "\n".join(f"- {r['id']}: {r['title']}" for r in know.get("regulations", []))
    prompt = _PROMPT[lang].format(text=text, title=know.get("title_ar"),
                                  conf=top["confidence"], regs=regs, arts=arts,
                                  schema=_SCHEMA)
    out = layer.generate_json(prompt)
    if not out:
        return None
    clean: dict = {}
    for k in ("summary", "scenario_analysis", "business_impact",
              "root_cause", "attack_scenario"):
        v = out.get(k)
        if isinstance(v, str) and len(v.strip()) >= 15:
            clean[k] = v.strip()
    for k in ("immediate_actions", "long_term_actions"):
        v = out.get(k)
        if isinstance(v, list):
            items = [str(x).strip() for x in v if str(x).strip()]
            if len(items) >= 2:
                clean[k] = items[:6]
    return clean or None


# ───────────────────────── بناء التقرير ─────────────────────────

def build_report(text: str, predictions: list[dict], articles: list[dict],
                 engine_info: dict | None = None, use_llm: bool = True,
                 lang: str = "auto") -> dict:
    if lang not in ("ar", "en"):
        lang = detect_lang(text)
    top = predictions[0]
    cat = top["category"]
    know = get_knowledge(cat, lang)
    severity = SEVERITY_MAP.get(cat, "Medium")
    facts = extract_scenario_facts(text, lang)
    t = L10N[lang]

    enrich = _llm_enrich(text, top, know, articles, lang) if use_llm else None
    layer = smart_layer()
    report_layer = layer.provider if enrich else "template"
    report_model = layer.model_name if enrich else None

    summary = (enrich or {}).get("summary") or _local_summary(
        top, know, articles, facts, lang)

    cat_label = (CATEGORY_EN if lang == "en" else CATEGORY_AR).get(cat, cat)
    return {
        "lang": lang,
        "input": text,
        "classification": {
            "category": cat,
            "category_ar": cat_label,          # نص بلغة التقرير (اسم تاريخي)
            "title_ar": know.get("title_ar", cat),
            "confidence": top["confidence"],
            "top_k": predictions,
        },
        "severity": severity,
        "severity_ar": _sev_label(severity, lang),
        "summary": summary,
        "scenario_facts": facts,
        "scenario_analysis": (enrich or {}).get("scenario_analysis", ""),
        "root_cause": (enrich or {}).get("root_cause", ""),
        "attack_scenario": (enrich or {}).get("attack_scenario", ""),
        "explanation": know.get("explain", ""),
        "business_impact": (enrich or {}).get("business_impact")
                           or know.get("business_impact", ""),
        "regulations": know.get("regulations", []),
        "matched_articles": articles,
        "potential_fines": know.get("fines", ""),
        "immediate_actions": (enrich or {}).get("immediate_actions")
                             or know.get("immediate_actions", []),
        "long_term_actions": (enrich or {}).get("long_term_actions")
                             or know.get("long_term_actions", []),
        "recommended_tools": know.get("tools", []),
        "estimated_cost": know.get("estimated_cost", ""),
        "compliance_deadline": know.get("deadline", ""),
        "kpis": know.get("kpis", []),
        "engine": {**(engine_info or {}),
                   "report_layer": report_layer,
                   "report_model": report_model},
        "disclaimer": t["disclaimer"],
    }


def format_report_text(r: dict) -> str:
    lang = r.get("lang", "ar")
    t = L10N[lang]
    L: list[str] = []
    line = "─" * 62
    L += [line, t["header"], line]
    L.append(f"{t['input']}: {r['input']}")
    c = r["classification"]
    L += ["", f"■ {t['cls']:9s}: {c['title_ar']}  [{c['category']}]",
          f"■ {t['conf']:9s}: {c['confidence']:.1f}%"]
    others = "، ".join(f"{p['category']} {p['confidence']:.0f}%"
                       for p in c["top_k"][1:])
    if others:
        L.append(f"■ {t['alts']:9s}: {others}")
    L.append(f"■ {t['sev']:9s}: {r['severity_ar']} ({r['severity']})")
    L += ["", t["summary"], "   " + r["summary"]]
    if r.get("scenario_analysis"):
        L += ["", t["scen"], "   " + r["scenario_analysis"]]
    if r.get("root_cause"):
        L.append("   " + t["root"] + r["root_cause"])
    if r.get("attack_scenario"):
        L += ["", t["atk"], "   " + r["attack_scenario"]]
    L += ["", t["impact"], "   " + r["business_impact"]]
    L += ["", t["regs"]]
    for reg in r["regulations"]:
        L += [f"   • {reg['id']} — {reg['title']}", f"     {reg['desc']}"]
    if r["matched_articles"]:
        L += ["", t["arts"]]
        for a in r["matched_articles"]:
            src = f" — {a['source']}" if a.get("source") else ""
            L += [f"   • [{a['similarity']:.0f}%] {a['id']}{src}",
                  f"     {a['text']}"]
    L += ["", t["fines"], "   " + r["potential_fines"]]
    L += ["", t["now"]]
    L += [f"   {i}. {a}" for i, a in enumerate(r["immediate_actions"], 1)]
    L += ["", t["long"]]
    L += [f"   {i}. {a}" for i, a in enumerate(r["long_term_actions"], 1)]
    if r["recommended_tools"]:
        L += ["", t["tools"] + "، ".join(r["recommended_tools"])]
    if r.get("estimated_cost"):
        L += ["", t["cost"] + r["estimated_cost"]]
    L += ["", t["deadline"] + r["compliance_deadline"]]
    if r["kpis"]:
        L += ["", t["kpis"]]
        L += [f"   • {k}" for k in r["kpis"]]
    eng = r.get("engine", {})
    model = f" ({eng.get('report_model')})" if eng.get("report_model") else ""
    L += ["", line,
          t["engine"].format(c=eng.get("classifier", "?"),
                             r=eng.get("retriever", "?"),
                             l=eng.get("report_layer", "template"), m=model),
          r["disclaimer"], line]
    return "\n".join(L)
