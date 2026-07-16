# -*- coding: utf-8 -*-
"""Data sources that feed the findings database.

1. Manual analysis — handled in server.py via POST /analyze (save=True)
2. Excel import — read_excel_rows / excel_template_bytes
3. Mock SOAR generator — PROTOTYPE standing in for a future real SOAR ingest.
   Real SOC/SOAR wiring is a future step; keep the same alert→analyze→save shape.
"""
from __future__ import annotations

import io
import random
from datetime import datetime, timezone
from typing import Any

from .config import CATEGORIES

# Departments used by mock SOAR (and Excel examples)
DEPARTMENTS = [
    "Infrastructure",
    "Platform Operations",
    "Modern Workplace",
    "Supply Chain",
    "Finance",
    "HR",
]

_USERS = [
    "admin_ops",
    "svc_backup",
    "root",
    "j.alharbi",
    "svc_payroll",
    "db_admin",
    "net_ops",
    "contractor_ext",
]

_IPS = [
    "185.220.101.44",
    "45.33.32.156",
    "103.27.128.19",
    "91.219.237.220",
    "194.26.29.15",
    "5.188.206.88",
]

_COUNTRIES = ["الصين", "روسيا", "إيران", "كوريا الشمالية", "فيتنام", "البرازيل"]

_SYSTEMS = [
    "نظام الدفع",
    "قاعدة بيانات العملاء",
    "Active Directory",
    "الموارد البشرية",
    "بيئة الإنتاج",
    "الخزينة",
    "SWIFT",
]

_TIMES = ["3:47 فجراً", "2:15 فجراً", "4:03 فجراً", "1:58 فجراً", "23:41 مساءً"]

# 2–3 realistic Arabic SOAR-alert templates per category.
# soar_category_hint is for verification only — never passed to the classifier.
_SOAR_TEMPLATES: dict[str, list[str]] = {
    "PAM": [
        "تنبيه SOAR: استخدام حساب مميز {user} للوصول إلى {system} من عنوان IP خارجي {ip} ({country}) في {time} دون تذكرة تغيير معتمدة.",
        "تنبيه SOAR: جلسة إدارة privileged للحساب {user} على {system} استمرت أكثر من 4 ساعات مع محاولات رفع صلاحيات متكررة ({attempts} محاولة).",
        "تنبيه SOAR: كشف مشاركة كلمة مرور حساب root/admin المرتبط بـ {system} بين أكثر من مشغّل — مصدر التنبيه: خزنة PAM.",
    ],
    "MFA_MISSING": [
        "تنبيه SOAR: تسجيل دخول ناجح للمستخدم {user} إلى {system} بكلمة مرور فقط بدون MFA من {ip} ({country}) عند {time}.",
        "تنبيه SOAR: سياسة MFA معطّلة لحساب إداري {user} على {system}؛ رُصد وصول عن بُعد من {ip}.",
        "تنبيه SOAR: محاولة تجاوز التحقق متعدد العوامل للمستخدم {user} على بوابة {system} — {attempts} محاولات خلال ساعة.",
    ],
    "STALE_ACCOUNT": [
        "تنبيه SOAR: حساب {user} المرتبط بموظف مغادر ما زال نشطاً ودخل إلى {system} من {ip} في {time}.",
        "تنبيه SOAR: حساب خدمة {user} لم يُستخدم 180 يوماً ثم سجّل دخولاً مفاجئاً إلى {system} ونقل {volume} GB.",
        "تنبيه SOAR: هوية خاملة {user} أُعيد تفعيلها دون طلب HR ثم وصلت إلى {system}.",
    ],
    "EXCESSIVE_PRIVILEGES": [
        "تنبيه SOAR: المستخدم {user} في قسم غير تقني يمتلك صلاحيات Domain Admin على {system} — كشف مراجعة وصول.",
        "تنبيه SOAR: توسعة صلاحيات {user} على {system} تتجاوز الدور الوظيفي مع إمكانية حذف سجلات التدقيق.",
        "تنبيه SOAR: حساب {user} يجمع بين صلاحيات التطوير والنشر على {system} دون فصل مهام.",
    ],
    "SEGREGATION_OF_DUTIES": [
        "تنبيه SOAR: نفس المستخدم {user} أنشأ واعتمد دفعة مالية على {system} بقيمة عالية دون مراجع ثانٍ.",
        "تنبيه SOAR: خرق فصل المهام — {user} يعدّل إعدادات الأمان ويراجع سجلات {system} بنفسه.",
        "تنبيه SOAR: مستخدم {user} يجمع أدوار Maker وChecker على {system} (SWIFT/مدفوعات).",
    ],
    "WEAK_PASSWORD": [
        "تنبيه SOAR: كشف كلمة مرور ضعيفة/معروفة للحساب {user} على {system} عبر فحص كلمات المرور المؤسسي.",
        "تنبيه SOAR: حساب {user} يستخدم كلمة مرور لم تُغيّر منذ أكثر من سنة على {system}؛ تطابق مع تسريب معروف.",
        "تنبيه SOAR: فشل سياسة التعقيد — {user} على {system} بكلمة مرور قصيرة قابلة للتخمين من {ip}.",
    ],
    "AUDIT_LOG_MISSING": [
        "تنبيه SOAR: انقطاع إرسال سجلات التدقيق من {system} إلى SIEM لأكثر من 6 ساعات؛ آخر حدث عند {time}.",
        "تنبيه SOAR: تعطيل تسجيل أحداث الدخول على {system} بواسطة {user} — فجوة مراقبة مكتشفة.",
        "تنبيه SOAR: نقص سجلات الجلسات المميزة لـ {system} خلال نافذة نقل بيانات بحجم {volume} GB.",
    ],
    "SUSPICIOUS_BEHAVIOR": [
        "تنبيه SOAR: سلوك غير اعتيادي — المستخدم {user} سحب {volume} GB من {system} عند {time} من {ip} ({country}).",
        "تنبيه SOAR: سلسلة محاولات فاشلة ثم ناجحة ({attempts}) لـ {user} على {system} من {ip} في {time}.",
        "تنبيه SOAR: تنقل جانبي مشبوه من محطة {user} نحو {system} بعد تنبيه تصيّد مرتبط بـ {country}.",
    ],
}


def generate_soar_alerts(
    count: int,
    categories: list[str] | None = None,
) -> list[dict[str, Any]]:
    """Generate mock SOAR alerts (PROTOTYPE — not a live SOC feed).

    Returns list of {text, department, soar_category_hint, alert_time}.
    soar_category_hint is for verification only — do NOT pass it to the classifier.
    """
    count = max(1, min(int(count or 1), 100))
    cats = [c for c in (categories or CATEGORIES) if c in CATEGORIES]
    if not cats:
        cats = list(CATEGORIES)

    alerts: list[dict[str, Any]] = []
    for i in range(count):
        cat = cats[i % len(cats)]
        templates = _SOAR_TEMPLATES.get(cat) or _SOAR_TEMPLATES["SUSPICIOUS_BEHAVIOR"]
        tmpl = random.choice(templates)
        text = tmpl.format(
            user=random.choice(_USERS),
            ip=random.choice(_IPS),
            country=random.choice(_COUNTRIES),
            system=random.choice(_SYSTEMS),
            time=random.choice(_TIMES),
            volume=random.choice([2, 5, 12, 28, 47, 120]),
            attempts=random.choice([7, 12, 23, 41, 86]),
        )
        alerts.append(
            {
                "text": text,
                "department": random.choice(DEPARTMENTS),
                "soar_category_hint": cat,  # verification only — never sent to classifier
                "alert_time": datetime.now(timezone.utc)
                .replace(microsecond=0)
                .isoformat()
                .replace("+00:00", "Z"),
            }
        )
    return alerts


def read_excel_rows(file_bytes: bytes) -> list[dict[str, str]]:
    """Parse .xlsx/.xls/.csv bytes into [{text, department}]."""
    import pandas as pd

    if not file_bytes:
        return []

    buf = io.BytesIO(file_bytes)
    df = None
    # Try Excel first, then CSV
    for reader in (
        lambda: pd.read_excel(buf),
        lambda: pd.read_csv(io.BytesIO(file_bytes), encoding="utf-8-sig"),
        lambda: pd.read_csv(io.BytesIO(file_bytes), encoding="utf-8"),
    ):
        try:
            buf.seek(0)
            df = reader()
            break
        except Exception:  # noqa: BLE001
            df = None
            continue
    if df is None or df.empty:
        return []

    cols = {str(c).strip().lower(): c for c in df.columns}
    text_aliases = [
        "description",
        "وصف",
        "المخالفة",
        "الوصف",
        "text",
        "finding",
        "الملاحظة",
        "ملاحظة",
    ]
    dept_aliases = ["department", "القسم", "الإدارة", "dept", "ادارة", "قسم"]

    text_col = None
    for a in text_aliases:
        if a.lower() in cols:
            text_col = cols[a.lower()]
            break
        # also match original column names case-insensitively / Arabic as-is
        for raw, orig in cols.items():
            if raw == a or str(orig).strip() == a:
                text_col = orig
                break
        if text_col is not None:
            break
    if text_col is None:
        text_col = df.columns[0]

    dept_col = None
    for a in dept_aliases:
        for raw, orig in cols.items():
            if raw == a.lower() or str(orig).strip() == a:
                dept_col = orig
                break
        if dept_col is not None:
            break

    rows: list[dict[str, str]] = []
    for _, row in df.iterrows():
        text = row.get(text_col)
        if text is None or (isinstance(text, float) and pd.isna(text)):
            continue
        text_s = str(text).strip()
        if not text_s or text_s.lower() == "nan":
            continue
        dept = ""
        if dept_col is not None:
            dv = row.get(dept_col)
            if dv is not None and not (isinstance(dv, float) and pd.isna(dv)):
                dept = str(dv).strip()
                if dept.lower() == "nan":
                    dept = ""
        rows.append({"text": text_s, "department": dept or "Unassigned"})
    return rows


def excel_template_bytes() -> bytes:
    """Sample .xlsx with الوصف + القسم and 3 example rows."""
    import pandas as pd

    df = pd.DataFrame(
        [
            {
                "الوصف": "حساب admin على نظام الدفع يعمل بدون MFA منذ أسبوعين",
                "القسم": "Platform Operations",
            },
            {
                "الوصف": "موظف مغادر ما زال حسابه Active Directory نشطاً ويدخل إلى الموارد البشرية",
                "القسم": "HR",
            },
            {
                "الوصف": "كلمة مرور ضعيفة لحساب svc_backup على بيئة الإنتاج لم تُغيّر منذ سنة",
                "القسم": "Infrastructure",
            },
        ]
    )
    buf = io.BytesIO()
    df.to_excel(buf, index=False, engine="openpyxl")
    return buf.getvalue()
