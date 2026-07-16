# -*- coding: utf-8 -*-
"""قاعدة المعرفة التنظيمية — ما يجعل التقرير المحلي مفصّلاً بدون أي API.

لكل فئة من الفئات الثماني: شرح، أثر على الأعمال، الضوابط التنظيمية المرتبطة
(NCA ECC / SAMA CSF / SDAIA PDPL / NIST)، الغرامات المحتملة، إجراءات فورية
وطويلة المدى، أدوات موصى بها، مهلة معالجة، ومؤشرات متابعة.

المراجع نصية استرشادية من ملفات pdfs/ — الرجوع للنص الرسمي واجب قبل أي قرار.
"""
from __future__ import annotations

PDPL_NOTE = (
    "إذا كانت المخالفة تمسّ بيانات شخصية فقد تنطبق أحكام نظام حماية البيانات "
    "الشخصية (PDPL) ولوائحه: المادة 19 (تدابير الحماية التنظيمية والإدارية "
    "والتقنية) والمادة 20 (الإشعار عن حوادث تسرب البيانات)، وقد تصل الغرامات "
    "بحسب نصوص العقوبات إلى 5,000,000 ريال وتضاعف عند التكرار."
)

KNOWLEDGE = {
    "PAM": {
        "title_ar": "قصور إدارة الحسابات المميزة (PAM)",
        "explain": (
            "الحسابات المميزة (Admin/Root/حسابات الخدمة) تمنح تحكماً واسعاً في الأنظمة، "
            "وأي قصور في حصرها أو مراقبتها أو تدوير كلمات مرورها يجعلها الهدف الأول "
            "للمهاجمين ويصعّب احتواء أي اختراق."
        ),
        "business_impact": (
            "اختراق حساب مميز واحد قد يعني السيطرة الكاملة على الأنظمة الحساسة، "
            "تعطيل الخدمات المصرفية، تسريب بيانات العملاء، وخسائر مالية وسمعية جسيمة "
            "مع مساءلة تنظيمية مباشرة من SAMA وNCA."
        ),
        "regulations": [
            {"id": "NCA ECC 2-2-3", "title": "إدارة هويات الدخول والصلاحيات — الحسابات المميزة",
             "desc": "حصر الحسابات الهامة والمميزة وإدارتها وتقييد استخدامها ومراقبتها بشكل مستمر."},
            {"id": "SAMA CSF 3.3.5", "title": "Identity & Access Management",
             "desc": "ضوابط إلزامية للمؤسسات المالية لإدارة الوصول المميز ومراجعته دورياً."},
            {"id": "NIST SP 800-53 AC-6", "title": "Least Privilege",
             "desc": "تقييد الصلاحيات المميزة لأقل حد ممكن ومراقبة استخدامها."},
        ],
        "fines": (
            "قد تُصنَّف ملاحظة جوهرية في تقييم SAMA/NCA مع إجراءات إشرافية قد تشمل "
            "غرامات وقيوداً تشغيلية بحسب الأنظمة ذات الصلة. " + PDPL_NOTE
        ),
        "immediate_actions": [
            "حصر جميع الحسابات المميزة على الأنظمة الحرجة خلال 24 ساعة.",
            "تغيير كلمات مرور الحسابات المميزة المكشوفة وتفعيل MFA عليها فوراً.",
            "تقييد الدخول المميز عبر محطات إدارة معزولة (PAW) أو Jump Server.",
            "تفعيل تسجيل وتنبيه فوري لأي استخدام لحساب مميز.",
        ],
        "long_term_actions": [
            "نشر حل PAM مركزي (خزنة كلمات مرور، تسجيل جلسات، Just-in-Time Access).",
            "إلغاء الصلاحيات المميزة الدائمة والتحول إلى صلاحيات مؤقتة عند الطلب.",
            "مراجعة ربع سنوية موثقة لجميع الحسابات المميزة مع إقفال الملاحظات.",
            "دمج سجلات PAM مع SIEM وحالات استخدام كشف إساءة الاستخدام.",
        ],
        "tools": ["CyberArk", "BeyondTrust", "Delinea (Thycotic)", "Microsoft Entra PIM"],
        "deadline": "إجراء فوري خلال 24–72 ساعة، ومعالجة جذرية خلال 30 يوماً.",
        "estimated_cost": "نشر PAM مؤسسي: 300,000–1,500,000 ريال (رخص + تكامل) · إجراءات فورية: شبه مجانية",
        "kpis": [
            "نسبة الحسابات المميزة المدارة عبر PAM (الهدف 100%).",
            "متوسط زمن اكتشاف استخدام مميز غير مصرح (MTTD).",
            "عدد الحسابات المميزة الدائمة (الهدف: صفر خارج الاستثناءات الموثقة).",
        ],
    },

    "MFA_MISSING": {
        "title_ar": "غياب المصادقة متعددة العوامل (MFA)",
        "explain": (
            "الاعتماد على كلمة المرور وحدها يجعل الحساب قابلاً للاختراق عبر التصيد أو "
            "تسريب كلمات المرور أو التخمين، خصوصاً للدخول عن بُعد والحسابات المميزة."
        ),
        "business_impact": (
            "استيلاء على حسابات موظفين أو عملاء، تنفيذ عمليات مالية احتيالية، "
            "ودخول غير مصرح للأنظمة الحساسة يصعب نسبه لصاحب الحساب الحقيقي."
        ),
        "regulations": [
            {"id": "NCA ECC 2-2-3-3", "title": "التحقق متعدد العناصر",
             "desc": "إلزام المصادقة متعددة العناصر للدخول عن بُعد وللحسابات المميزة."},
            {"id": "SAMA CSF 3.3.5", "title": "Identity & Access Management",
             "desc": "متطلبات مصادقة قوية للوصول للأنظمة المالية الحساسة."},
            {"id": "NIST SP 800-63B", "title": "Digital Identity — Authentication",
             "desc": "معايير المصادقة الحديثة ومستويات ضمان الهوية AAL."},
        ],
        "fines": (
            "غياب MFA على أنظمة حساسة يُعد قصوراً جوهرياً في الضوابط الأساسية أمام "
            "SAMA/NCA وقد يستدعي إجراءات تصحيحية ملزمة. " + PDPL_NOTE
        ),
        "immediate_actions": [
            "تفعيل MFA فوراً على الحسابات المميزة وكل دخول عن بُعد (VPN/OWA/Portal).",
            "تعطيل البروتوكولات القديمة التي تتجاوز MFA (Legacy Auth).",
            "مراجعة سجلات الدخول لآخر 30 يوماً لرصد أي دخول مشبوه قبل التفعيل.",
        ],
        "long_term_actions": [
            "تعميم MFA على جميع المستخدمين مع أولوية للأنظمة الحرجة.",
            "اعتماد عوامل مقاومة للتصيد (FIDO2/مفاتيح أمان) للحسابات عالية الخطورة.",
            "سياسات وصول مشروط (Conditional Access) حسب الموقع والجهاز والمخاطر.",
        ],
        "tools": ["Microsoft Entra MFA", "Cisco Duo", "RSA SecurID", "YubiKey (FIDO2)"],
        "deadline": "تفعيل خلال 7 أيام للحسابات الحرجة، وتعميم كامل خلال 60 يوماً.",
        "estimated_cost": "تعميم MFA: 50–150 ريال/مستخدم سنوياً · مفاتيح FIDO2: 100–250 ريال/مفتاح",
        "kpis": [
            "نسبة تغطية MFA للمستخدمين والحسابات المميزة (الهدف 100%).",
            "عدد عمليات الدخول عبر بروتوكولات قديمة (الهدف: صفر).",
        ],
    },

    "STALE_ACCOUNT": {
        "title_ar": "حسابات خاملة / لموظفين مغادرين",
        "explain": (
            "الحسابات التي لم تُستخدم لفترة طويلة أو تعود لموظفين انتهت خدمتهم تبقى "
            "أبواباً خلفية مفتوحة: صلاحياتها سارية ولا أحد يراقبها أو يتحمل مسؤوليتها."
        ),
        "business_impact": (
            "استغلال الحساب من موظف سابق أو مهاجم خارجي دون لفت الانتباه، "
            "مع صعوبة الإسناد في التحقيقات وتضخم غير مبرر في سطح الهجوم."
        ),
        "regulations": [
            {"id": "NCA ECC 2-2-3-4", "title": "المراجعة الدورية للهويات والصلاحيات",
             "desc": "مراجعة هويات الدخول والصلاحيات دورياً وإلغاء غير المستخدم منها."},
            {"id": "SAMA CSF 3.3.5", "title": "User Access Lifecycle",
             "desc": "ضوابط دورة حياة الوصول: المنح، التعديل، والإلغاء الفوري عند انتهاء العلاقة."},
            {"id": "NIST SP 800-53 AC-2", "title": "Account Management",
             "desc": "تعطيل الحسابات غير النشطة خلال مدد محددة وتوثيق ذلك."},
        ],
        "fines": (
            "تُرصد عادةً كملاحظة تدقيق عالية الخطورة لدى SAMA/NCA وتستوجب خطة "
            "معالجة موثقة بمهل زمنية. " + PDPL_NOTE
        ),
        "immediate_actions": [
            "تعطيل فوري لكل حساب بلا نشاط لأكثر من 90 يوماً (بعد استثناءات موثقة).",
            "مطابقة قائمة الحسابات مع سجلات الموارد البشرية للمغادرين خلال 48 ساعة.",
            "إبطال جلسات وTokens الحسابات المعطلة وتغيير أي أسرار مرتبطة بها.",
        ],
        "long_term_actions": [
            "أتمتة ربط HR مع إدارة الهوية (Joiner/Mover/Leaver) للإلغاء الفوري.",
            "حملة إعادة اعتماد وصول (Access Recertification) نصف سنوية موثقة.",
            "تقارير شهرية آلية للحسابات الخاملة تُرفع لمالكي الأنظمة.",
        ],
        "tools": ["SailPoint", "Saviynt", "Microsoft Entra ID Governance", "One Identity"],
        "deadline": "تعطيل الخامل خلال 7 أيام، وأتمتة دورة الحياة خلال 90 يوماً.",
        "estimated_cost": "أتمتة دورة الحياة (IGA): 200,000–800,000 ريال · التعطيل اليدوي الفوري: مجاني",
        "kpis": [
            "عدد الحسابات النشطة لموظفين مغادرين (الهدف: صفر).",
            "متوسط زمن إلغاء الوصول بعد انتهاء الخدمة (الهدف: نفس اليوم).",
        ],
    },

    "EXCESSIVE_PRIVILEGES": {
        "title_ar": "صلاحيات زائدة عن الحاجة",
        "explain": (
            "منح المستخدم صلاحيات تتجاوز متطلبات عمله يخالف مبدأ الحد الأدنى من "
            "الامتيازات، ويضاعف أثر أي اختراق أو خطأ بشري."
        ),
        "business_impact": (
            "توسيع نطاق الضرر عند اختراق أي حساب عادي، وإمكانية اطلاع أو تعديل غير "
            "مصرح على بيانات مالية أو شخصية، وإضعاف الحوكمة أمام المدققين."
        ),
        "regulations": [
            {"id": "NCA ECC 2-2-3-2", "title": "الحد الأدنى من الصلاحيات والحاجة إلى المعرفة",
             "desc": "منح الصلاحيات وفق Need-to-Know/Least Privilege ومراجعتها دورياً."},
            {"id": "SAMA CSF 3.3.5", "title": "Access Authorization",
             "desc": "اعتماد الصلاحيات بناءً على الدور الوظيفي وموافقات موثقة."},
            {"id": "NIST SP 800-53 AC-6", "title": "Least Privilege",
             "desc": "تقييد الصلاحيات ومراجعة الامتيازات الممنوحة بشكل دوري."},
        ],
        "fines": (
            "ملاحظة حوكمة متكررة في تقارير الالتزام؛ استمرارها يرفع تصنيف المخاطر "
            "لدى الجهات الرقابية. " + PDPL_NOTE
        ),
        "immediate_actions": [
            "سحب الصلاحيات غير المبررة للحسابات المحددة خلال 72 ساعة.",
            "تجميد أي صلاحية 'وصول كامل' غير موثقة بموافقة مالك النظام.",
            "توثيق مصفوفة الصلاحيات الحالية للأنظمة المتأثرة كخط أساس.",
        ],
        "long_term_actions": [
            "بناء نموذج أدوار (RBAC) معتمد ومصفوفة صلاحيات لكل نظام حرج.",
            "مراجعة إعادة اعتماد دورية للصلاحيات مع مالكي الأعمال (ربع/نصف سنوية).",
            "أتمتة طلبات الصلاحيات بموافقات متسلسلة وسجل تدقيق كامل.",
        ],
        "tools": ["SailPoint", "Saviynt", "Microsoft Entra ID Governance", "Okta Identity Governance"],
        "deadline": "تصحيح الحالات الحرجة خلال 30 يوماً، ونموذج RBAC خلال 90 يوماً.",
        "estimated_cost": "بناء RBAC ومراجعات الاعتماد: 150,000–600,000 ريال (استشارات + أداة)",
        "kpis": [
            "نسبة الصلاحيات المطابقة لمصفوفة الأدوار المعتمدة.",
            "عدد الاستثناءات النشطة على مبدأ الحد الأدنى (مع تاريخ انتهاء لكل استثناء).",
        ],
    },

    "SEGREGATION_OF_DUTIES": {
        "title_ar": "غياب الفصل بين المهام (SoD)",
        "explain": (
            "قيام الشخص نفسه بإنشاء العملية واعتمادها (أو الجمع بين أدوار متعارضة) "
            "يلغي الرقابة الداخلية ويفتح باب الاحتيال والخطأ دون اكتشاف."
        ),
        "business_impact": (
            "احتيال داخلي يصعب كشفه، عمليات مالية غير مشروعة، وملاحظات جوهرية في "
            "التدقيق الداخلي والخارجي قد تصل للجهات الرقابية."
        ),
        "regulations": [
            {"id": "NCA ECC 2-2-3-2", "title": "فصل المهام ضمن إدارة الصلاحيات",
             "desc": "تطبيق فصل المهام في منح الصلاحيات والعمليات الحساسة."},
            {"id": "SAMA CSF 3.3.5", "title": "Segregation of Duties",
             "desc": "منع الجمع بين أدوار متعارضة في الأنظمة المالية والتشغيلية."},
            {"id": "NIST SP 800-53 AC-5", "title": "Separation of Duties",
             "desc": "توزيع المهام الحساسة على أكثر من شخص وتوثيق ذلك تقنياً."},
        ],
        "fines": (
            "تعامل معها الجهات الرقابية كضعف رقابي جوهري، وقد تستدعي إعادة تقييم "
            "شامل لبيئة الرقابة الداخلية. " + PDPL_NOTE
        ),
        "immediate_actions": [
            "إيقاف الجمع بين الإنشاء والاعتماد للعمليات الحساسة فوراً (Workflow ثنائي).",
            "حصر الحالات القائمة للتعارض في الأنظمة المالية خلال أسبوع.",
            "فرض موافقة شخص ثانٍ (4-Eyes) على العمليات فوق حد مالي محدد.",
        ],
        "long_term_actions": [
            "بناء مصفوفة تعارض المهام (SoD Matrix) وفرضها تقنياً داخل الأنظمة.",
            "فحص آلي دوري للتعارضات مع سير عمل لمعالجة الاستثناءات.",
            "تدريب مالكي العمليات على تصميم ضوابط رقابية سليمة.",
        ],
        "tools": ["SAP GRC", "SailPoint", "Saviynt", "Oracle Risk Management Cloud"],
        "deadline": "كسر التعارضات الحرجة خلال 14 يوماً، ومصفوفة SoD خلال 60 يوماً.",
        "estimated_cost": "ضبط Workflow ومصفوفة SoD: 100,000–500,000 ريال حسب عدد الأنظمة",
        "kpis": [
            "عدد تعارضات SoD النشطة في الأنظمة الحرجة (الهدف: صفر بلا استثناء موثق).",
            "نسبة العمليات الحساسة الخاضعة لموافقة ثنائية.",
        ],
    },

    "WEAK_PASSWORD": {
        "title_ar": "كلمات مرور ضعيفة",
        "explain": (
            "كلمات المرور القصيرة أو الشائعة أو غير المتجددة تُكسر خلال دقائق بهجمات "
            "التخمين والقواميس، وغالباً ما تكون أول ثغرة في سلسلة الاختراق."
        ),
        "business_impact": (
            "اختراق حسابات على نطاق واسع بجهد منخفض، وانتقال جانبي داخل الشبكة، "
            "وفشل في اختبارات الاختراق والتقييمات الرقابية."
        ),
        "regulations": [
            {"id": "NCA ECC 2-2-3", "title": "سياسة كلمات المرور الآمنة",
             "desc": "اعتماد وتطبيق معايير كلمات مرور آمنة ضمن إدارة الهويات."},
            {"id": "SAMA CSF 3.3.5", "title": "Authentication Standards",
             "desc": "متطلبات قوة المصادقة وإدارة أسرار الدخول للمؤسسات المالية."},
            {"id": "NIST SP 800-63B", "title": "Memorized Secrets",
             "desc": "طول لا يقل عن 8 (ويفضل 12+)، حظر كلمات المرور المسربة، وعدم فرض تعقيد شكلي."},
        ],
        "fines": (
            "ملاحظة أساسية متكررة في الفحوص الرقابية؛ إهمال معالجتها يُقرأ كضعف في "
            "النضج الأمني العام. " + PDPL_NOTE
        ),
        "immediate_actions": [
            "فرض تغيير كلمات المرور المخالفة للسياسة عند أول تسجيل دخول.",
            "تفعيل قفل الحساب بعد محاولات فاشلة متكررة ومراقبة هجمات الرش (Spraying).",
            "فحص كلمات المرور الحالية ضد قوائم التسريبات الشائعة.",
        ],
        "long_term_actions": [
            "سياسة كلمات مرور حديثة: 12+ خانة، حظر المسرّب/الشائع، وعبارات مرور.",
            "نشر مدير كلمات مرور مؤسسي وتقليل الاعتماد عليها عبر SSO + MFA.",
            "التوجه التدريجي نحو مصادقة بلا كلمة مرور (Passwordless/FIDO2).",
        ],
        "tools": ["Specops Password Policy", "AD Fine-Grained Password Policies", "1Password Business", "HaveIBeenPwned API"],
        "deadline": "تصحيح الحسابات الحرجة خلال 7 أيام، وسياسة محدثة خلال 30 يوماً.",
        "estimated_cost": "سياسة + فحص التسريبات: 20,000–80,000 ريال · Passwordless لاحقاً: أعلى",
        "kpis": [
            "نسبة الحسابات المطابقة للسياسة الجديدة.",
            "عدد كلمات المرور المكتشفة في قوائم التسريب (الهدف: صفر).",
        ],
    },

    "AUDIT_LOG_MISSING": {
        "title_ar": "غياب سجلات التدقيق والمراقبة",
        "explain": (
            "بدون سجلات أحداث مفعّلة ومركزية ومحمية من العبث، تفقد المنظمة القدرة على "
            "اكتشاف الهجمات، والتحقيق فيها، وإثبات الالتزام أمام الجهات الرقابية."
        ),
        "business_impact": (
            "هجمات تمر دون اكتشاف لأشهر، استحالة تحديد نطاق الاختراق والإسناد، "
            "وفشل مباشر في متطلبات SAMA/NCA للمراقبة الأمنية."
        ),
        "regulations": [
            {"id": "NCA ECC 2-12", "title": "إدارة سجلات الأحداث ومراقبة الأمن السيبراني",
             "desc": "تفعيل سجلات الأحداث على الأصول الحرجة، جمعها مركزياً، ومراجعتها."},
            {"id": "SAMA CSF 3.3.14", "title": "Security Event Management",
             "desc": "متطلبات SIEM/SOC ومراقبة الأحداث الأمنية على مدار الساعة."},
            {"id": "NIST SP 800-53 AU-2/AU-6", "title": "Audit Events & Review",
             "desc": "تحديد الأحداث الخاضعة للتدقيق ومراجعتها وحمايتها من التعديل."},
        ],
        "fines": (
            "قصور جوهري في متطلبات المراقبة الإلزامية؛ يظهر كملاحظة عالية الخطورة "
            "في أي تقييم ECC أو SAMA CSF. " + PDPL_NOTE
        ),
        "immediate_actions": [
            "تفعيل السجلات فوراً على الأنظمة الحرجة (مصادقة، صلاحيات، تغييرات).",
            "توجيه السجلات لمخزن مركزي محمي بصلاحيات قراءة فقط.",
            "ضبط مزامنة الوقت (NTP) لضمان تسلسل زمني موثوق للأحداث.",
        ],
        "long_term_actions": [
            "نشر SIEM مع حالات استخدام مغطية لأهم سيناريوهات الهجوم (MITRE ATT&CK).",
            "سياسة احتفاظ بالسجلات ≥ 12 شهراً (وفق متطلبات الجهة الرقابية).",
            "مراقبة 24/7 عبر SOC داخلي أو مُدار مع إجراءات تصعيد موثقة.",
        ],
        "tools": ["Microsoft Sentinel", "Splunk", "IBM QRadar", "Wazuh (مفتوح المصدر)"],
        "deadline": "تفعيل السجلات الحرجة خلال 72 ساعة، وتغطية SIEM خلال 90 يوماً.",
        "estimated_cost": "SIEM سحابي: يبدأ ~2,000 ريال/شهر حسب الحجم · Wazuh مفتوح المصدر: تكلفة تشغيل فقط",
        "kpis": [
            "نسبة الأصول الحرجة المرسلة سجلاتها للمخزن المركزي (الهدف 100%).",
            "متوسط زمن الاكتشاف MTTD للأحداث عالية الخطورة.",
        ],
    },

    "SUSPICIOUS_BEHAVIOR": {
        "title_ar": "سلوك مشبوه / نشاط غير اعتيادي",
        "explain": (
            "أنماط دخول أو استخدام تخرج عن السلوك الطبيعي (أوقات غريبة، أجهزة أو مواقع "
            "غير معروفة، محاولات متكررة، نقل بيانات ضخم) — مؤشرات اختراق محتمل جارٍ."
        ),
        "business_impact": (
            "قد يكون اختراقاً نشطاً الآن: سرقة بيانات، تحركات جانبية، أو تمهيد لهجوم "
            "أكبر. التأخر بالساعات قد يعني الفرق بين حادثة محدودة وكارثة."
        ),
        "regulations": [
            {"id": "NCA ECC 2-13", "title": "إدارة حوادث وتهديدات الأمن السيبراني",
             "desc": "خطة استجابة للحوادث، تصنيفها، والإبلاغ للجهات المختصة وفق المتطلبات."},
            {"id": "NCA ECC 2-12", "title": "مراقبة الأمن السيبراني",
             "desc": "رصد الأحداث وتحليلها لاكتشاف الأنشطة غير الاعتيادية مبكراً."},
            {"id": "SAMA CSF 3.3.15", "title": "Incident Management",
             "desc": "متطلبات الاستجابة للحوادث والإبلاغ للبنك المركزي ضمن مهل محددة."},
        ],
        "fines": (
            "التأخر في الاحتواء أو الإبلاغ قد يشكّل مخالفة مستقلة لمتطلبات الإبلاغ لدى "
            "SAMA/NCA. وإذا مسّ الحادث بيانات شخصية: " + PDPL_NOTE
        ),
        "immediate_actions": [
            "عزل الحساب/الجهاز المشتبه به فوراً وإنهاء الجلسات النشطة.",
            "تفعيل خطة الاستجابة للحوادث وتوثيق الجدول الزمني والأدلة (Chain of Custody).",
            "مراجعة سجلات آخر 72 ساعة لتحديد نطاق النشاط والحسابات المتأثرة.",
            "تقييم واجب الإبلاغ للجهات (SAMA/NCA/SDAIA) وفق نوع الحادث والقطاع.",
        ],
        "long_term_actions": [
            "نشر تحليلات سلوك المستخدم UEBA وربطها بالتنبيه الآلي.",
            "تمارين محاكاة (Tabletop/Red Team) دورية لاختبار جاهزية الاستجابة.",
            "تحديث حالات الاستخدام في SIEM بناءً على الدروس المستفادة من كل حادثة.",
        ],
        "tools": ["Microsoft Sentinel UEBA", "Exabeam", "Securonix", "CrowdStrike Falcon"],
        "deadline": "احتواء فوري خلال ساعات، وتقرير حادثة مكتمل خلال 5 أيام عمل.",
        "estimated_cost": "استجابة الحادثة الواحدة: 50,000–500,000+ ريال · UEBA: 150,000–700,000 ريال",
        "kpis": [
            "متوسط زمن الاحتواء MTTC للحوادث الحرجة.",
            "نسبة التنبيهات عالية الخطورة المعالجة ضمن SLA.",
        ],
    },
}


def get_knowledge(category: str, lang: str = "ar") -> dict:
    """يرجع معرفة الفئة بالعربية أو الإنجليزية (title_ar موحّد للاستخدام العام)."""
    if lang == "en":
        k = dict(KNOWLEDGE_EN.get(category, _GENERIC_EN))
        k["title_ar"] = k.get("title", category)  # مفتاح موحّد للعنوان
        return k
    k = KNOWLEDGE.get(category)
    if k is None:
        k = {
            "title_ar": category,
            "explain": "فئة غير معرفة في قاعدة المعرفة.",
            "business_impact": "يتطلب تقييماً يدوياً.",
            "regulations": [],
            "fines": PDPL_NOTE,
            "immediate_actions": ["مراجعة يدوية من فريق الالتزام."],
            "long_term_actions": [],
            "tools": [],
            "deadline": "حسب تقييم الفريق.",
            "estimated_cost": "",
            "kpis": [],
        }
    return k


# ═══════════════════════ English knowledge base ═══════════════════════

PDPL_NOTE_EN = (
    "Where personal data is involved, the Saudi Personal Data Protection Law "
    "(PDPL) and its regulations may apply — notably Article 19 (organizational, "
    "administrative and technical safeguards) and Article 20 (breach "
    "notification). Penalties can reach SAR 5,000,000 and may be doubled for "
    "repeat violations."
)

KNOWLEDGE_EN = {
    "PAM": {
        "title": "Privileged Access Management (PAM) Deficiency",
        "explain": (
            "Privileged accounts (Admin/Root/service accounts) grant sweeping "
            "control over systems. Any gap in inventorying, monitoring, or "
            "rotating their credentials makes them the primary target for "
            "attackers and severely complicates breach containment."
        ),
        "business_impact": (
            "Compromise of a single privileged account can mean full control "
            "over critical systems, disruption of banking services, customer "
            "data exfiltration, and major financial and reputational losses — "
            "with direct supervisory accountability to SAMA and NCA."
        ),
        "regulations": [
            {"id": "NCA ECC 2-2-3", "title": "Identity & Access Management — Privileged Accounts",
             "desc": "Inventory, manage, restrict and continuously monitor critical and privileged accounts."},
            {"id": "SAMA CSF 3.3.5", "title": "Identity & Access Management",
             "desc": "Mandatory controls for financial institutions to manage and periodically review privileged access."},
            {"id": "NIST SP 800-53 AC-6", "title": "Least Privilege",
             "desc": "Restrict privileged permissions to the minimum necessary and monitor their use."},
        ],
        "fines": (
            "Likely to be raised as a material finding in SAMA/NCA assessments, "
            "with supervisory measures that may include fines and operational "
            "restrictions under the applicable regulations. " + PDPL_NOTE_EN
        ),
        "immediate_actions": [
            "Inventory all privileged accounts on critical systems within 24 hours.",
            "Rotate exposed privileged credentials and enforce MFA on them immediately.",
            "Restrict privileged access to hardened admin workstations (PAW) or a jump server.",
            "Enable real-time logging and alerting for any privileged account use.",
        ],
        "long_term_actions": [
            "Deploy an enterprise PAM solution (credential vaulting, session recording, Just-in-Time access).",
            "Eliminate standing privileged access in favor of time-bound, on-request elevation.",
            "Run documented quarterly reviews of all privileged accounts with finding closure.",
            "Integrate PAM logs with the SIEM and misuse-detection use cases.",
        ],
        "tools": ["CyberArk", "BeyondTrust", "Delinea (Thycotic)", "Microsoft Entra PIM"],
        "deadline": "Immediate action within 24–72 hours; root-cause remediation within 30 days.",
        "estimated_cost": "Enterprise PAM rollout: SAR 300k–1.5M (licenses + integration); immediate actions: near zero cost",
        "kpis": [
            "Share of privileged accounts managed via PAM (target 100%).",
            "Mean time to detect unauthorized privileged use (MTTD).",
            "Number of standing privileged accounts (target: zero outside documented exceptions).",
        ],
    },

    "MFA_MISSING": {
        "title": "Missing Multi-Factor Authentication (MFA)",
        "explain": (
            "Relying on a password alone leaves accounts exposed to phishing, "
            "credential leaks and guessing — especially for remote access and "
            "privileged accounts."
        ),
        "business_impact": (
            "Account takeover of staff or customers, fraudulent financial "
            "transactions, and unauthorized access to sensitive systems that "
            "is hard to attribute to the legitimate account owner."
        ),
        "regulations": [
            {"id": "NCA ECC 2-2-3-3", "title": "Multi-Factor Verification",
             "desc": "MFA is mandated for remote access and for privileged accounts."},
            {"id": "SAMA CSF 3.3.5", "title": "Identity & Access Management",
             "desc": "Strong authentication requirements for access to sensitive financial systems."},
            {"id": "NIST SP 800-63B", "title": "Digital Identity — Authentication",
             "desc": "Modern authentication standards and Authenticator Assurance Levels (AAL)."},
        ],
        "fines": (
            "Absence of MFA on sensitive systems is treated as a fundamental "
            "control failure by SAMA/NCA and may trigger binding corrective "
            "measures. " + PDPL_NOTE_EN
        ),
        "immediate_actions": [
            "Enforce MFA now on privileged accounts and all remote access (VPN/OWA/portals).",
            "Disable legacy protocols that bypass MFA (Legacy Auth).",
            "Review the last 30 days of sign-in logs for suspicious access prior to enforcement.",
        ],
        "long_term_actions": [
            "Roll out MFA to all users, prioritizing critical systems.",
            "Adopt phishing-resistant factors (FIDO2/security keys) for high-risk accounts.",
            "Apply Conditional Access policies based on location, device and risk.",
        ],
        "tools": ["Microsoft Entra MFA", "Cisco Duo", "RSA SecurID", "YubiKey (FIDO2)"],
        "deadline": "Enable within 7 days for critical accounts; full rollout within 60 days.",
        "estimated_cost": "MFA rollout: SAR 50–150/user/year; FIDO2 keys: SAR 100–250 each",
        "kpis": [
            "MFA coverage across users and privileged accounts (target 100%).",
            "Sign-ins over legacy protocols (target: zero).",
        ],
    },

    "STALE_ACCOUNT": {
        "title": "Stale / Leaver Accounts",
        "explain": (
            "Accounts unused for long periods, or belonging to departed staff, "
            "remain open back doors: their permissions stay valid while nobody "
            "monitors or owns them."
        ),
        "business_impact": (
            "Exploitation by a former employee or external attacker without "
            "raising attention, attribution difficulties during investigations, "
            "and unjustified growth of the attack surface."
        ),
        "regulations": [
            {"id": "NCA ECC 2-2-3-4", "title": "Periodic Review of Identities & Entitlements",
             "desc": "Review identities and entitlements periodically and revoke those unused."},
            {"id": "SAMA CSF 3.3.5", "title": "User Access Lifecycle",
             "desc": "Controls over granting, modifying, and immediate revocation upon separation."},
            {"id": "NIST SP 800-53 AC-2", "title": "Account Management",
             "desc": "Disable inactive accounts within defined timeframes and document it."},
        ],
        "fines": (
            "Typically raised as a high-risk audit finding by SAMA/NCA, "
            "requiring a documented remediation plan with deadlines. " + PDPL_NOTE_EN
        ),
        "immediate_actions": [
            "Immediately disable every account inactive for 90+ days (after documented exceptions).",
            "Reconcile account lists against HR leaver records within 48 hours.",
            "Revoke sessions and tokens of disabled accounts and rotate any linked secrets.",
        ],
        "long_term_actions": [
            "Automate HR-to-IAM integration (Joiner/Mover/Leaver) for immediate deprovisioning.",
            "Run documented semi-annual access recertification campaigns.",
            "Automated monthly stale-account reports to system owners.",
        ],
        "tools": ["SailPoint", "Saviynt", "Microsoft Entra ID Governance", "One Identity"],
        "deadline": "Disable stale accounts within 7 days; lifecycle automation within 90 days.",
        "estimated_cost": "IGA lifecycle automation: SAR 200k–800k; immediate manual disablement: free",
        "kpis": [
            "Active accounts belonging to departed staff (target: zero).",
            "Average time to revoke access after separation (target: same day).",
        ],
    },

    "EXCESSIVE_PRIVILEGES": {
        "title": "Excessive Privileges",
        "explain": (
            "Granting users permissions beyond their job needs violates the "
            "principle of least privilege and multiplies the blast radius of "
            "any compromise or human error."
        ),
        "business_impact": (
            "Wider damage when any ordinary account is compromised, potential "
            "unauthorized viewing or modification of financial or personal "
            "data, and weakened governance posture before auditors."
        ),
        "regulations": [
            {"id": "NCA ECC 2-2-3-2", "title": "Least Privilege & Need-to-Know",
             "desc": "Grant entitlements on a need-to-know/least-privilege basis and review them periodically."},
            {"id": "SAMA CSF 3.3.5", "title": "Access Authorization",
             "desc": "Role-based entitlements with documented approvals."},
            {"id": "NIST SP 800-53 AC-6", "title": "Least Privilege",
             "desc": "Restrict permissions and periodically review granted privileges."},
        ],
        "fines": (
            "A recurring governance finding in compliance reports; persistence "
            "raises the institution's supervisory risk rating. " + PDPL_NOTE_EN
        ),
        "immediate_actions": [
            "Revoke unjustified entitlements on the identified accounts within 72 hours.",
            "Freeze any 'full access' grant lacking documented system-owner approval.",
            "Document the current entitlement matrix of affected systems as a baseline.",
        ],
        "long_term_actions": [
            "Build an approved RBAC model and entitlement matrix per critical system.",
            "Periodic recertification with business owners (quarterly/semi-annual).",
            "Automate entitlement requests with sequential approvals and a full audit trail.",
        ],
        "tools": ["SailPoint", "Saviynt", "Microsoft Entra ID Governance", "Okta Identity Governance"],
        "deadline": "Fix critical cases within 30 days; RBAC model within 90 days.",
        "estimated_cost": "RBAC build + recertification: SAR 150k–600k (consulting + tooling)",
        "kpis": [
            "Share of entitlements matching the approved role matrix.",
            "Active least-privilege exceptions (each with an expiry date).",
        ],
    },

    "SEGREGATION_OF_DUTIES": {
        "title": "Missing Segregation of Duties (SoD)",
        "explain": (
            "When the same person initiates and approves a transaction (or "
            "combines conflicting roles), internal control is nullified and "
            "fraud or error can pass undetected."
        ),
        "business_impact": (
            "Hard-to-detect internal fraud, illegitimate financial operations, "
            "and material findings in internal/external audits that may "
            "escalate to the regulators."
        ),
        "regulations": [
            {"id": "NCA ECC 2-2-3-2", "title": "Segregation of Duties within Access Management",
             "desc": "Apply SoD in entitlement granting and sensitive operations."},
            {"id": "SAMA CSF 3.3.5", "title": "Segregation of Duties",
             "desc": "Prevent combining conflicting roles in financial and operational systems."},
            {"id": "NIST SP 800-53 AC-5", "title": "Separation of Duties",
             "desc": "Distribute sensitive duties across individuals and enforce technically."},
        ],
        "fines": (
            "Regulators treat it as a material internal-control weakness that "
            "may trigger a full control-environment reassessment. " + PDPL_NOTE_EN
        ),
        "immediate_actions": [
            "Stop initiate-and-approve combinations for sensitive operations now (dual workflow).",
            "Inventory existing conflicts in financial systems within one week.",
            "Enforce second-person (4-eyes) approval above a defined financial threshold.",
        ],
        "long_term_actions": [
            "Build an SoD conflict matrix and enforce it technically inside the systems.",
            "Periodic automated conflict scanning with an exception-handling workflow.",
            "Train process owners on designing sound preventive controls.",
        ],
        "tools": ["SAP GRC", "SailPoint", "Saviynt", "Oracle Risk Management Cloud"],
        "deadline": "Break critical conflicts within 14 days; SoD matrix within 60 days.",
        "estimated_cost": "Workflow + SoD matrix implementation: SAR 100k–500k depending on system count",
        "kpis": [
            "Active SoD conflicts in critical systems (target: zero without documented exception).",
            "Share of sensitive operations under dual approval.",
        ],
    },

    "WEAK_PASSWORD": {
        "title": "Weak Passwords",
        "explain": (
            "Short, common, or never-rotated passwords fall to dictionary and "
            "guessing attacks within minutes and are often the first link in "
            "the breach chain."
        ),
        "business_impact": (
            "Large-scale account compromise at low attacker cost, lateral "
            "movement inside the network, and failures in penetration tests "
            "and supervisory assessments."
        ),
        "regulations": [
            {"id": "NCA ECC 2-2-3", "title": "Secure Password Policy",
             "desc": "Adopt and enforce secure password standards within identity management."},
            {"id": "SAMA CSF 3.3.5", "title": "Authentication Standards",
             "desc": "Authentication strength and credential-management requirements for financial institutions."},
            {"id": "NIST SP 800-63B", "title": "Memorized Secrets",
             "desc": "Minimum 8 (preferably 12+) characters, block breached passwords, avoid arbitrary complexity rules."},
        ],
        "fines": (
            "A recurring baseline finding in supervisory reviews; neglect reads "
            "as weak overall security maturity. " + PDPL_NOTE_EN
        ),
        "immediate_actions": [
            "Force reset of non-compliant passwords at next sign-in.",
            "Enable account lockout after repeated failures and monitor spraying attacks.",
            "Screen current passwords against common breach lists.",
        ],
        "long_term_actions": [
            "Modern password policy: 12+ chars, block breached/common values, passphrases.",
            "Deploy an enterprise password manager; reduce reliance via SSO + MFA.",
            "Move gradually to passwordless authentication (FIDO2).",
        ],
        "tools": ["Specops Password Policy", "AD Fine-Grained Password Policies", "1Password Business", "HaveIBeenPwned API"],
        "deadline": "Fix critical accounts within 7 days; updated policy within 30 days.",
        "estimated_cost": "Policy + breach screening: SAR 20k–80k; passwordless later: higher",
        "kpis": [
            "Share of accounts compliant with the new policy.",
            "Passwords found in breach lists (target: zero).",
        ],
    },

    "AUDIT_LOG_MISSING": {
        "title": "Missing Audit Logs & Monitoring",
        "explain": (
            "Without enabled, centralized, tamper-protected event logs, the "
            "organization cannot detect attacks, investigate them, or prove "
            "compliance to the regulators."
        ),
        "business_impact": (
            "Attacks that run undetected for months, inability to scope or "
            "attribute a breach, and direct failure against SAMA/NCA security "
            "monitoring requirements."
        ),
        "regulations": [
            {"id": "NCA ECC 2-12", "title": "Event Logs & Cybersecurity Monitoring",
             "desc": "Enable event logging on critical assets, centralize, and review."},
            {"id": "SAMA CSF 3.3.14", "title": "Security Event Management",
             "desc": "SIEM/SOC requirements and 24/7 security event monitoring."},
            {"id": "NIST SP 800-53 AU-2/AU-6", "title": "Audit Events & Review",
             "desc": "Define auditable events, review them, and protect logs from tampering."},
        ],
        "fines": (
            "A material gap against mandatory monitoring requirements; appears "
            "as a high-risk finding in any ECC or SAMA CSF assessment. " + PDPL_NOTE_EN
        ),
        "immediate_actions": [
            "Enable logging now on critical systems (authentication, entitlements, changes).",
            "Forward logs to a central, read-only protected store.",
            "Fix time sync (NTP) to guarantee a trustworthy event timeline.",
        ],
        "long_term_actions": [
            "Deploy a SIEM with use cases covering key attack scenarios (MITRE ATT&CK).",
            "Log retention policy of ≥ 12 months (per regulator requirements).",
            "24/7 monitoring via an internal or managed SOC with documented escalation.",
        ],
        "tools": ["Microsoft Sentinel", "Splunk", "IBM QRadar", "Wazuh (open source)"],
        "deadline": "Enable critical logs within 72 hours; SIEM coverage within 90 days.",
        "estimated_cost": "Cloud SIEM from ~SAR 2k/month by volume; Wazuh: operating cost only",
        "kpis": [
            "Share of critical assets shipping logs centrally (target 100%).",
            "MTTD for high-severity events.",
        ],
    },

    "SUSPICIOUS_BEHAVIOR": {
        "title": "Suspicious Behavior / Anomalous Activity",
        "explain": (
            "Sign-in or usage patterns outside the normal baseline (odd hours, "
            "unknown devices or locations, repeated failures, bulk data "
            "transfer) — indicators of a possibly ongoing compromise."
        ),
        "business_impact": (
            "This may be an active breach right now: data theft, lateral "
            "movement, or staging for a larger attack. Hours of delay can be "
            "the difference between a contained incident and a disaster."
        ),
        "regulations": [
            {"id": "NCA ECC 2-13", "title": "Cybersecurity Incident & Threat Management",
             "desc": "Incident response plan, classification, and reporting to authorities as required."},
            {"id": "NCA ECC 2-12", "title": "Cybersecurity Monitoring",
             "desc": "Monitor and analyze events to detect anomalous activity early."},
            {"id": "SAMA CSF 3.3.15", "title": "Incident Management",
             "desc": "Incident response and central-bank reporting within defined timeframes."},
        ],
        "fines": (
            "Delayed containment or reporting can itself constitute a separate "
            "violation of SAMA/NCA reporting obligations. If personal data is "
            "affected: " + PDPL_NOTE_EN
        ),
        "immediate_actions": [
            "Isolate the suspected account/device now and kill active sessions.",
            "Activate the incident response plan; document the timeline and evidence (chain of custody).",
            "Review the last 72 hours of logs to scope activity and affected accounts.",
            "Assess reporting obligations (SAMA/NCA/SDAIA) per incident type and sector.",
        ],
        "long_term_actions": [
            "Deploy UEBA behavioral analytics tied to automated alerting.",
            "Regular tabletop/red-team exercises to test response readiness.",
            "Update SIEM use cases from lessons learned after every incident.",
        ],
        "tools": ["Microsoft Sentinel UEBA", "Exabeam", "Securonix", "CrowdStrike Falcon"],
        "deadline": "Immediate containment within hours; full incident report within 5 business days.",
        "estimated_cost": "Single incident response: SAR 50k–500k+; UEBA: SAR 150k–700k",
        "kpis": [
            "Mean time to contain (MTTC) for critical incidents.",
            "Share of high-severity alerts handled within SLA.",
        ],
    },
}

_GENERIC_EN = {
    "title": "Unclassified",
    "explain": "Category not defined in the knowledge base.",
    "business_impact": "Requires manual assessment.",
    "regulations": [],
    "fines": PDPL_NOTE_EN,
    "immediate_actions": ["Manual review by the compliance team."],
    "long_term_actions": [],
    "tools": [],
    "deadline": "Per team assessment.",
    "estimated_cost": "",
    "kpis": [],
}
