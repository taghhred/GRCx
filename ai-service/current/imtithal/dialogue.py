# -*- coding: utf-8 -*-
"""GRCx dialogue engine — natural Q&A independent of AraBERT labels.

This is the active chat response generator when no CausalLM checkpoint is present.
AraBERT must never author these replies; it only supplies optional side metadata.
"""
from __future__ import annotations

import hashlib
import re
from typing import Any


# Topic cards: each question family gets a distinct answer shape.
_TOPICS: list[tuple[str, re.Pattern[str], dict[str, Any]]] = [
    (
        "iam",
        re.compile(
            r"\bIAM\b|identity\s*(and|&)?\s*access|إدارة\s*الهويات|إدارة\s*الوصول|"
            r"إدارة\s*الهوية|هويات\s*الوصول",
            re.I,
        ),
        {
            "en": {
                "headline": "Identity and Access Management (IAM)",
                "body": (
                    "IAM is the enterprise discipline that governs who can access which systems, "
                    "under what conditions, and for how long. It covers the full identity lifecycle "
                    "(joiner / mover / leaver), authentication, authorization, entitlement reviews, "
                    "and audit evidence that access remains least-privilege.\n\n"
                    "In practice IAM answers three questions continuously: (1) Is this the right "
                    "person? (2) Do they still need this access? (3) Can we prove it to auditors?\n\n"
                    "Typical IAM building blocks include a central identity directory, SSO, MFA, "
                    "role- or attribute-based access control, joiner-mover-leaver automation from HR, "
                    "and periodic access certification. In Saudi GRC programs, IAM evidence maps "
                    "strongly to NCA ECC identity controls (notably the 2-2-3 family)."
                ),
                "contrast": (
                    "IAM is the broad identity platform for all users. PAM is a specialized layer "
                    "for privileged / admin accounts only — vaulting, session control, and just-in-time elevation."
                ),
            },
            "ar": {
                "headline": "إدارة الهويات وصلاحيات الوصول (IAM)",
                "body": (
                    "IAM هي منظومة المؤسسة التي تحدد من يصل إلى أي نظام، وبأي شروط، ولأي مدة. "
                    "تشمل دورة حياة الهوية كاملة (انضمام / نقل / مغادرة)، المصادقة، التفويض، "
                    "مراجعات الصلاحيات، وأدلة التدقيق على أن الوصول يبقى وفق الحد الأدنى من الصلاحيات.\n\n"
                    "عملياً تجيب IAM باستمرار على ثلاثة أسئلة: (1) هل هذا الشخص الصحيح؟ "
                    "(2) هل ما زال يحتاج هذا الوصول؟ (3) هل نستطيع إثبات ذلك للمراجعين؟\n\n"
                    "مكونات IAM الشائعة: دليل هويات مركزي، تسجيل دخول موحّد (SSO)، MFA، "
                    "تحكم بالأدوار/السمات، أتمتة مع الموارد البشرية، وشهادات وصول دورية. "
                    "في برامج الحوكمة السعودية ترتبط أدلة IAM بقوة بضوابط NCA ECC للهويات (عائلة 2-2-3)."
                ),
                "contrast": (
                    "IAM هي المنصة العامة لكل المستخدمين. PAM طبقة متخصصة للحسابات المميزة فقط — "
                    "خزنة أوراق اعتماد، تسجيل جلسات، ورفع صلاحيات لحظي (JIT)."
                ),
            },
        },
    ),
    (
        "pam",
        re.compile(
            r"\bPAM\b|privileged\s*access|حسابات?\s*مميز|صلاحيات?\s*مميز|"
            r"إدارة\s*الوصول\s*المميز",
            re.I,
        ),
        {
            "en": {
                "headline": "Privileged Access Management (PAM)",
                "body": (
                    "PAM focuses on the small set of high-impact accounts — domain admins, root, "
                    "break-glass, cloud owners, and service accounts with broad rights. Those "
                    "identities are vaulted, checked out with approval or just-in-time elevation, "
                    "session-recorded, and continuously monitored because compromise equals "
                    "business-wide blast radius.\n\n"
                    "A mature PAM program removes standing admin passwords from humans, enforces "
                    "dual control where needed, rotates credentials automatically, and feeds "
                    "session telemetry into SIEM/SOAR playbooks."
                ),
                "contrast": (
                    "Compared with IAM: IAM manages everyday workforce access; PAM hardens and "
                    "supervises privileged pathways only."
                ),
            },
            "ar": {
                "headline": "إدارة الوصول المميز (PAM)",
                "body": (
                    "تركّز PAM على الحسابات عالية التأثير — مدراء النطاق، root، حسابات الطوارئ، "
                    "مالكي السحابة، وحسابات الخدمات ذات الصلاحيات الواسعة. تُحفظ أوراق الاعتماد "
                    "في خزنة، وتُستخرج بموافقة أو رفع لحظي، وتُسجَّل الجلسات وتُراقب باستمرار "
                    "لأن اختراقها يعني نطاقاً واسعاً من الضرر.\n\n"
                    "برنامج PAM الناضج يلغي كلمات مرور الإدارة الدائمة لدى البشر، يفرض الرقابة "
                    "الثنائية عند الحاجة، يدوّر الأسرار تلقائياً، ويمرّر بيانات الجلسات إلى SIEM/SOAR."
                ),
                "contrast": (
                    "مقارنةً بـ IAM: IAM تدير وصول القوى العاملة اليومي؛ PAM تحصّن وتشرف على "
                    "مسارات الصلاحيات المميزة فقط."
                ),
            },
        },
    ),
    (
        "iam_vs_pam",
        re.compile(
            r"(difference|differ|vs\.?|versus|مقارن|الفرق|فرق).{0,40}(IAM|PAM)|(IAM).{0,40}(PAM)|(PAM).{0,40}(IAM)",
            re.I,
        ),
        {
            "en": {
                "headline": "IAM vs PAM — what actually differs",
                "body": (
                    "Scope: IAM covers every workforce and application identity. PAM covers only "
                    "privileged identities and the pathways used to elevate.\n\n"
                    "Controls: IAM emphasizes SSO, MFA, roles, joiner-mover-leaver, and access reviews. "
                    "PAM emphasizes credential vaults, session recording, just-in-time admin, and "
                    "break-glass procedures.\n\n"
                    "Risk: IAM failures cause oversharing and orphan accounts. PAM failures enable "
                    "domain/cloud takeover. Most mature programs run both — IAM as the foundation, "
                    "PAM as the privileged overlay."
                ),
                "contrast": "",
            },
            "ar": {
                "headline": "الفرق بين IAM و PAM",
                "body": (
                    "النطاق: IAM تغطي كل هويات القوى العاملة والتطبيقات. PAM تغطي الهويات المميزة "
                    "ومسارات رفع الصلاحيات فقط.\n\n"
                    "الضوابط: IAM تركّز على SSO و MFA والأدوار ودورة الانضمام/النقل/المغادرة "
                    "ومراجعات الوصول. PAM تركّز على خزائن الأسرار وتسجيل الجلسات والإدارة اللحظية "
                    "وإجراءات الطوارئ.\n\n"
                    "المخاطر: فشل IAM يؤدي إلى مشاركة زائدة وحسابات يتيمة. فشل PAM يمكّن من السيطرة "
                    "على النطاق/السحابة. البرامج الناضجة تشغّل الاثنين — IAM كأساس و PAM كطبقة مميزة."
                ),
                "contrast": "",
            },
        },
    ),
    (
        "nca_password",
        re.compile(
            r"NCA\s*ECC.{0,30}password|password.{0,30}(NCA|ECC)|سياسة\s*كلمات?\s*المرور|"
            r"كلمة\s*المرور.{0,20}(NCA|ECC|الوطنية)|ECC.{0,20}(password|مرور)",
            re.I,
        ),
        {
            "en": {
                "headline": "NCA ECC password / authentication expectations",
                "body": (
                    "Under the NCA Essential Cybersecurity Controls (ECC), password practice is not "
                    "a standalone slogan — it sits inside identity and access management (control "
                    "family 2-2-3). Organizations are expected to enforce strong authentication "
                    "policies: sufficient length and complexity (or modern passphrase / passwordless "
                    "equivalents), protection against reuse and guessing, secure storage/hashing, "
                    "and — for sensitive and privileged access — multi-factor authentication rather "
                    "than password alone.\n\n"
                    "Operationally that means: publish and enforce a password/authenticator standard, "
                    "block known-bad credentials, rotate after compromise, prefer MFA for remote and "
                    "admin access, and keep evidence (policy, IdP settings, sample configs, review "
                    "logs) ready for ECC assessments.\n\n"
                    "GRCx treats weak-password and MFA-gap findings as compliance risk signals that "
                    "map back to those ECC identity controls — not as cosmetic IT hygiene."
                ),
                "contrast": "",
            },
            "ar": {
                "headline": "توقعات NCA ECC لسياسة كلمات المرور / المصادقة",
                "body": (
                    "ضمن ضوابط الأمن السيبراني الأساسية (NCA ECC) لا تُعامل كلمات المرور كشعار منفصل، "
                    "بل ضمن إدارة الهويات وصلاحيات الوصول (عائلة الضوابط 2-2-3). يُتوقع من الجهات "
                    "فرض سياسات مصادقة قوية: طول وتعقيد كافيان (أو عبارات مرور / بدائل بدون كلمة مرور)، "
                    "الحماية من إعادة الاستخدام والتخمين، التخزين الآمن/التجزئة، ولصلاحيات الحساسة "
                    "والمميزة — تحقق متعدد العوامل بدل كلمة المرور وحدها.\n\n"
                    "عملياً: انشر وفعّل معيار المصادقة، امنع الأسرار المعروفة بالضعف، دوّر بعد الاختراق، "
                    "فضّل MFA للوصول عن بُعد والإدارة، واحتفظ بالأدلة (سياسة، إعدادات IdP، عينات، "
                    "سجلات مراجعة) لتقييمات ECC.\n\n"
                    "في GRCx تُعامل نتائج كلمات المرور الضعيفة وفجوات MFA كإشارات مخاطر امتثال "
                    "ترتبط بضوابط الهويات في ECC — لا كتحسينات تقنية تجميلية."
                ),
                "contrast": "",
            },
        },
    ),
    (
        "soar",
        re.compile(r"\bSOAR\b|security\s*orchestration|أتمتة\s*الاستجابة|تنسيق\s*الأمن", re.I),
        {
            "en": {
                "headline": "Security Orchestration, Automation and Response (SOAR)",
                "body": (
                    "SOAR platforms connect detection (SIEM, EDR, threat intel) to repeatable response "
                    "playbooks. When an alert fires, SOAR can enrich indicators, open a case, page "
                    "the right owners, isolate a host, revoke a session, or collect forensic artifacts "
                    "— with human approval gates for high-impact actions.\n\n"
                    "The value is speed and consistency: the same MFA-failure or privileged-abuse "
                    "pattern gets the same evidence pack and the same escalation path every time, "
                    "which shrinks mean-time-to-respond and strengthens auditability."
                ),
                "contrast": (
                    "SOAR does not replace IAM/PAM; it orchestrates what happens after identity or "
                    "security signals indicate risk."
                ),
            },
            "ar": {
                "headline": "تنسيق وأتمتة واستجابة الأمن (SOAR)",
                "body": (
                    "تربط منصات SOAR بين الكشف (SIEM و EDR ومعلومات التهديدات) وكتب تشغيل استجابة "
                    "قابلة للتكرار. عند إطلاق تنبيه يمكن لـ SOAR إثراء المؤشرات، فتح حالة، استدعاء "
                    "المسؤولين، عزل جهاز، إلغاء جلسة، أو جمع أدلة — مع بوابات موافقة بشرية "
                    "للإجراءات عالية الأثر.\n\n"
                    "القيمة في السرعة والاتساق: نفس نمط فشل MFA أو إساءة صلاحيات مميزة يحصل على "
                    "نفس حزمة الأدلة ونفس مسار التصعيد في كل مرة، فيقل زمن الاستجابة وتتعزز القابلية "
                    "للتدقيق."
                ),
                "contrast": (
                    "SOAR لا تستبدل IAM/PAM؛ بل تنسّق ما يحدث بعد أن تشير إشارات الهوية أو الأمن إلى خطر."
                ),
            },
        },
    ),
    (
        "grcx_soar",
        re.compile(
            r"(GRCx|why).{0,40}SOAR|SOAR.{0,40}(GRCx|integrat|why|لماذا|دمج)|لماذا.{0,30}SOAR|"
            r"دمج.{0,20}SOAR|integrat.{0,20}SOAR",
            re.I,
        ),
        {
            "en": {
                "headline": "Why GRCx integrates SOAR",
                "body": (
                    "GRCx is a governance fabric: findings, risks, controls, and ownership live in "
                    "one place. SOAR is the execution fabric for security operations. Integrating "
                    "them closes the loop between “we classified a control gap” and “we actually "
                    "contained the related incident.”\n\n"
                    "Concrete benefits: (1) Compliance violations and identity anomalies can trigger "
                    "standardized playbooks instead of ad-hoc chat. (2) Response actions produce "
                    "artifacts that feed back into cases, risks, and audit evidence inside GRCx. "
                    "(3) Leadership sees both posture (GRC) and operational readiness (SOAR) without "
                    "two disconnected truths.\n\n"
                    "In short: GRCx decides and records what must be governed; SOAR helps the SOC "
                    "act on signals that threaten those controls — with traceability both ways."
                ),
                "contrast": "",
            },
            "ar": {
                "headline": "لماذا يدمج GRCx منصة SOAR",
                "body": (
                    "GRCx نسيج حوكمة: النتائج والمخاطر والضوابط والملكية في مكان واحد. SOAR نسيج "
                    "تنفيذ لعمليات الأمن. دمجهما يغلق الحلقة بين «صنّفنا فجوة ضابط» و«احتوينا الحادث المرتبط فعلياً».\n\n"
                    "فوائد ملموسة: (1) مخالفات الامتثال وشذوذ الهويات تشغّل كتب تشغيل موحّدة بدل "
                    "استجابات عشوائية. (2) إجراءات الاستجابة تنتج أدلة تعود إلى الحالات والمخاطر "
                    "وسجلات التدقيق داخل GRCx. (3) القيادة ترى الوضع الحوكمي (GRC) وجاهزية التشغيل "
                    "(SOAR) دون حقيقتين منفصلتين.\n\n"
                    "باختصار: GRCx يقرّر ويسجّل ما يجب حوكمته؛ SOAR يساعد مركز العمليات على التصرف "
                    "تجاه الإشارات التي تهدد تلك الضوابط — مع قابلية تتبع باتجاهين."
                ),
                "contrast": "",
            },
        },
    ),
    (
        "mfa",
        re.compile(r"\bMFA\b|multi[- ]?factor|التحقق\s*المتعدد|متعدد\s*العوامل", re.I),
        {
            "en": {
                "headline": "Multi-Factor Authentication (MFA)",
                "body": (
                    "MFA requires at least two independent factors (something you know, have, or are) "
                    "before access is granted. It is one of the highest-ROI controls against phishing "
                    "and credential stuffing, and it is expected for remote, privileged, and sensitive "
                    "access under frameworks such as NCA ECC 2-2-3-3."
                ),
                "contrast": "",
            },
            "ar": {
                "headline": "التحقق متعدد العوامل (MFA)",
                "body": (
                    "يتطلب MFA عاملين مستقلين على الأقل قبل منح الوصول. وهو من أعلى الضوابط عائداً "
                    "ضد التصيّد وحشو بيانات الاعتماد، ويُتوقع للوصول عن بُعد والمميز والحساس ضمن "
                    "أطر مثل NCA ECC 2-2-3-3."
                ),
                "contrast": "",
            },
        },
    ),
]


def detect_dialogue_topic(user_text: str) -> str | None:
    t = user_text or ""
    # Prefer more specific topics first (ordered list already places iam_vs_pam / grcx_soar carefully)
    priority = [
        "iam_vs_pam",
        "grcx_soar",
        "nca_password",
        "soar",
        "pam",
        "iam",
        "mfa",
    ]
    by_id = {tid: (pat, card) for tid, pat, card in _TOPICS}
    for tid in priority:
        pat, _ = by_id[tid]
        if pat.search(t):
            return tid
    for tid, pat, _ in _TOPICS:
        if pat.search(t):
            return tid
    return None


def _variant_seed(user_text: str, topic: str) -> int:
    h = hashlib.sha256(f"{topic}|{user_text.strip().lower()}".encode("utf-8")).hexdigest()
    return int(h[:8], 16)


def compose_dialogue_reply(
    *,
    user_text: str,
    lang: str,
    module: str = "",
    user_first_name: str | None = None,
    classification: dict[str, Any] | None = None,
) -> tuple[str, dict[str, Any]]:
    """Return (reply_text, meta). Never uses AraBERT text as the answer body."""
    topic = detect_dialogue_topic(user_text)
    name = user_first_name or ("there" if lang == "en" else "بك")
    meta: dict[str, Any] = {
        "response_engine": "grcx-dialogue-engine",
        "dialogue_topic": topic or "general",
        "arabert_used_for_answer": False,
    }

    if topic:
        card = next(c for tid, _, c in _TOPICS if tid == topic)
        pack = card["en" if lang == "en" else "ar"]
        seed = _variant_seed(user_text, topic)
        openers_en = [
            f"{name}, here's a focused take on {pack['headline']}.",
            f"Good question — let's unpack {pack['headline']} in a GRC context.",
            f"In GRCx terms, {pack['headline']} works like this:",
        ]
        openers_ar = [
            f"إليك توضيحاً مركّزاً عن {pack['headline']}.",
            f"سؤال مهم — لنشرح {pack['headline']} في سياق الحوكمة والامتثال.",
            f"ضمن منظور GRCx، يعمل {pack['headline']} كالتالي:",
        ]
        opener = (openers_en if lang == "en" else openers_ar)[seed % 3]
        parts = [opener, "", pack["body"]]
        if pack.get("contrast"):
            parts += ["", pack["contrast"]]
        if module:
            if lang == "en":
                parts += ["", f"(You asked this while viewing: {module}.)"]
            else:
                parts += ["", f"(طرحت السؤال وأنت في واجهة: {module}.)"]
        # Optional classifier footnote — never the main answer
        if classification and classification.get("category"):
            cat = classification["category"]
            conf = float(classification.get("confidence") or 0)
            if lang == "en":
                parts += [
                    "",
                    f"— Side signal from AraBERT classifier (not the answer source): "
                    f"{cat} · {conf:.1f}%. Ask to “analyze” for a full violation report.",
                ]
            else:
                parts += [
                    "",
                    f"— إشارة جانبية من مصنّف AraBERT (ليست مصدر الإجابة): "
                    f"{cat} · {conf:.1f}%. اطلب «حلّل» لتقرير مخالفة كامل.",
                ]
        return "\n".join(parts), meta

    # General conversational fallback (still not AraBERT-authored)
    if lang == "en":
        text = (
            f"Hi {name}. I can explain GRC concepts (IAM, PAM, MFA, SOAR, NCA ECC controls), "
            f"compare practices, or analyze a concrete violation scenario.\n\n"
            f"You asked: {user_text}\n\n"
            f"Try a specific topic — for example “Explain IAM”, “Difference between IAM and PAM”, "
            f"or “Explain why GRCx integrates SOAR”. "
            f"Paste an incident description and say “analyze” if you need a violation report."
        )
    else:
        text = (
            f"أهلاً. يمكنني شرح مفاهيم الحوكمة (IAM و PAM و MFA و SOAR وضوابط NCA ECC)، "
            f"أو المقارنة بينها، أو تحليل سيناريو مخالفة.\n\n"
            f"سؤالك: {user_text}\n\n"
            f"جرّب موضوعاً محدداً مثل «اشرح IAM» أو «الفرق بين IAM و PAM» أو "
            f"«لماذا يدمج GRCx منصة SOAR». للصق حالة مخالفة اكتب «حلّل»."
        )
    if classification and classification.get("category"):
        cat = classification["category"]
        conf = float(classification.get("confidence") or 0)
        if lang == "en":
            text += f"\n\n(AraBERT side hint only: {cat} · {conf:.1f}% — not used as the answer.)"
        else:
            text += f"\n\n(تلميح جانبي من AraBERT فقط: {cat} · {conf:.1f}% — لم يُستخدم كإجابة.)"
    return text, meta
