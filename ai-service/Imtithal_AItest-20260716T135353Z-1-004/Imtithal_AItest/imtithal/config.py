# -*- coding: utf-8 -*-
"""إعدادات امتثال — المسارات والفئات والثوابت."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
MODELS_DIR = ROOT / "models"
CLASSIFIER_DIR = MODELS_DIR / "classifier"
ARTICLES_JSON = DATA_DIR / "legal_articles_from_pdfs.json"
EMBEDDINGS_DIR = MODELS_DIR / "embeddings"
EMBEDDINGS_PT = EMBEDDINGS_DIR / "article_embeddings.pt"

SBERT_MODEL = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"

# فئات المخالفات الثماني (IAM)
CATEGORIES = [
    "AUDIT_LOG_MISSING",
    "EXCESSIVE_PRIVILEGES",
    "MFA_MISSING",
    "PAM",
    "SEGREGATION_OF_DUTIES",
    "STALE_ACCOUNT",
    "SUSPICIOUS_BEHAVIOR",
    "WEAK_PASSWORD",
]

CATEGORY_AR = {
    "AUDIT_LOG_MISSING": "غياب سجلات التدقيق والمراقبة",
    "EXCESSIVE_PRIVILEGES": "صلاحيات زائدة عن الحاجة",
    "MFA_MISSING": "غياب المصادقة متعددة العوامل",
    "PAM": "قصور إدارة الحسابات المميزة",
    "SEGREGATION_OF_DUTIES": "غياب الفصل بين المهام",
    "STALE_ACCOUNT": "حسابات خاملة / غير مستخدمة",
    "SUSPICIOUS_BEHAVIOR": "سلوك مشبوه / نشاط غير اعتيادي",
    "WEAK_PASSWORD": "كلمات مرور ضعيفة",
}

SEVERITY_MAP = {
    "PAM": "Critical",
    "SUSPICIOUS_BEHAVIOR": "Critical",
    "MFA_MISSING": "High",
    "STALE_ACCOUNT": "High",
    "AUDIT_LOG_MISSING": "High",
    "SEGREGATION_OF_DUTIES": "High",
    "EXCESSIVE_PRIVILEGES": "Medium",
    "WEAK_PASSWORD": "Medium",
}

CATEGORY_EN = {
    "AUDIT_LOG_MISSING": "Missing audit logs & monitoring",
    "EXCESSIVE_PRIVILEGES": "Excessive privileges",
    "MFA_MISSING": "Missing multi-factor authentication",
    "PAM": "Privileged access management deficiency",
    "SEGREGATION_OF_DUTIES": "Missing segregation of duties",
    "STALE_ACCOUNT": "Stale / leaver accounts",
    "SUSPICIOUS_BEHAVIOR": "Suspicious / anomalous behavior",
    "WEAK_PASSWORD": "Weak passwords",
}

SEVERITY_EN = {
    "Critical": "Critical",
    "High": "High",
    "Medium": "Medium",
    "Low": "Low",
}

SEVERITY_AR = {
    "Critical": "حرجة",
    "High": "عالية",
    "Medium": "متوسطة",
    "Low": "منخفضة",
}

# كلمات مفتاحية لتعزيز التصنيف (عربي + إنجليزي)
CATEGORY_KEYWORDS = {
    "PAM": [
        "حساب مميز", "حسابات مميزة", "admin", "administrator", "root", "مدير النظام",
        "privileged", "pam", "domain admin", "صلاحيات إدارية", "sysadmin",
        "حساب الخدمة", "service account", "كلمة مرور مشتركة", "مرور مشترك",
        "بين المدراء", "مشتركة بين", "لا يتم تدوير", "بدون تدوير", "break glass", "جلسة مميزة",
    ],
    "MFA_MISSING": [
        "بدون مصادقة ثنائية", "بدون mfa", "mfa", "مصادقة متعددة", "التحقق بخطوتين",
        "otp", "two-factor", "2fa", "عامل ثاني", "بدون تحقق إضافي", "مصادقة ثنائية",
        "بدون otp", "كلمة مرور فقط", "password only", "عامل واحد", "single factor",
        "بدون توثيق ثنائي",
    ],
    "STALE_ACCOUNT": [
        "خامل", "خاملة", "غير مستخدم", "لم يسجل دخول", "موظف مستقيل", "منتهي",
        "dormant", "inactive", "stale", "terminated", "لم يستخدم منذ", "تركوا العمل",
    ],
    "EXCESSIVE_PRIVILEGES": [
        "صلاحيات زائدة", "صلاحيات أكثر", "وصول كامل", "full access", "excessive",
        "over-privileged", "صلاحيات واسعة", "أكثر من حاجته", "صلاحية غير مبررة",
    ],
    "SEGREGATION_OF_DUTIES": [
        "فصل المهام", "نفس الموظف", "يعتمد بنفسه", "segregation", "sod",
        "تعارض مصالح", "منشئ ومعتمد", "يدخل ويوافق", "نفس الشخص",
    ],
    "WEAK_PASSWORD": [
        "كلمة مرور ضعيفة", "كلمة سر ضعيفة", "password", "123456", "p@ssw0rd",
        "بدون تعقيد", "كلمة مرور بسيطة", "لم تتغير كلمة المرور", "weak password",
        "بدون انتهاء صلاحية", "نفس كلمة المرور",
    ],
    "AUDIT_LOG_MISSING": [
        "سجلات التدقيق", "سجلات الأحداث", "بدون سجل", "logs", "logging", "audit log",
        "لا يوجد سجل", "تعطيل السجلات", "بدون مراقبة", "event log", "سجل الأحداث",
        "siem", "بدون سجلات", "لا توجد سجلات", "غياب السجلات", "مراقبة أمنية",
    ],
    "SUSPICIOUS_BEHAVIOR": [
        "مشبوه", "غريب", "3 الفجر", "الفجر", "منتصف الليل", "خارج الدوام",
        "محاولات فاشلة", "brute force", "دولة أخرى", "ip غريب", "جهاز غريب",
        "تسريب", "اختراق", "ddos", "هجوم", "malware", "تصيد", "phishing",
        "نقل بيانات ضخم", "تحميل غير اعتيادي",
    ],
}

# أولوية المصادر في البحث الدلالي
SOURCE_PRIORITY = {
    "01_regulations": 1.15,
    "02_audit_reports": 1.05,
    "03_reference": 1.0,
    "04_policies": 1.0,
}
