"""
نظام المحاماة السعودي - المرسوم الملكي م/38 بتاريخ 28/7/1422هـ
المواد ذات الصلة بالتأديب والمخالفات المهنية
"""

LAWYERS_SYSTEM_ARTICLES = {
    "Art39": {
        "number": "39",
        "title": "الأعمال المحظورة على المحامي",
        "text": """يُحظر على المحامي:
أ- الجمع بين مهنة المحاماة وأي عمل حكومي أو شبه حكومي.
ب- تقديم أي خدمة لموكله إذا كانت تتعارض مع مصالح موكل آخر له.
ج- شراء كل أو بعض الحقوق المتنازع عليها التي كُلّف بها.
د- اتخاذ وكالة أو ممارسة أي نشاط يتعارض مع التزاماته المهنية.
هـ- الإدلاء بأي تصريح كاذب أو مضلل أمام المحاكم أو الجهات الحكومية.""",
        "violations": ["conflict_of_interest", "false_representation", "fraud_deception"],
    },
    "Art40": {
        "number": "40",
        "title": "الواجبات المهنية للمحامي",
        "text": """على المحامي:
أ- المحافظة على أسرار موكله ولو بعد انتهاء العلاقة.
ب- تسليم موكله جميع المستندات والأوراق عند انتهاء الوكالة.
ج- الإخطار الفوري لموكله بكل ما يتعلق بقضيته.
د- بذل العناية الواجبة في تمثيل موكله.
هـ- الالتزام بمواعيد المحاكم والجلسات.""",
        "violations": ["professional_duty_breach", "confidentiality_violation", "file_retention"],
    },
    "Art41": {
        "number": "41",
        "title": "العقوبات التأديبية",
        "text": """مع مراعاة ما يقضي به نظام الإجراءات الجزائية، تكون العقوبات التأديبية للمحامين على النحو الآتي:
أ- التنبيه.
ب- اللوم.
ج- الغرامة المالية بما لا يزيد على خمسة آلاف ريال.
د- وقف المحامي عن مزاولة المهنة مدة لا تزيد على سنة.
هـ- شطب اسم المحامي من جدول المحامين.""",
        "sanctions": ["warning", "censure", "fine", "temp_suspension", "disbarment"],
    },
    "Art42": {
        "number": "42",
        "title": "لجنة التأديب",
        "text": """تُشكّل بقرار من وزير العدل لجنة أو أكثر للنظر في المخالفات التأديبية للمحامين،
تتألف من رئيس من القضاء وعضوين من ذوي الخبرة في القانون لا تقل خبرة كل منهم عن عشر سنوات.
تُعقد جلسات اللجنة سراً وتصدر قراراتها بأغلبية الآراء.""",
        "procedure": "committee_composition",
    },
    "Art43": {
        "number": "43",
        "title": "الطعن في قرارات لجنة التأديب",
        "text": """يجوز للمحامي الطعن في قرار لجنة التأديب أمام ديوان المظالم خلال ستين يوماً من تاريخ إبلاغه بالقرار.""",
        "appeal_deadline_days": 60,
    },
}

VIOLATION_TYPES = {
    "professional_duty_breach": {
        "name_ar": "إخلال بالواجبات المهنية",
        "description_ar": "التقصير في أداء الواجبات المهنية تجاه الموكل أو المحكمة",
        "applicable_articles": ["Art40"],
        "base_severity": "medium",
        "base_sanction_range": ["warning", "censure", "fine"],
    },
    "confidentiality_violation": {
        "name_ar": "إفشاء الأسرار",
        "description_ar": "الإفصاح عن المعلومات السرية للموكل دون إذن",
        "applicable_articles": ["Art40"],
        "base_severity": "high",
        "base_sanction_range": ["fine", "temp_suspension"],
    },
    "conflict_of_interest": {
        "name_ar": "تضارب المصالح",
        "description_ar": "تمثيل أطراف متعارضة المصالح في نفس القضية أو القضايا المرتبطة",
        "applicable_articles": ["Art39"],
        "base_severity": "high",
        "base_sanction_range": ["fine", "temp_suspension"],
    },
    "fraud_deception": {
        "name_ar": "التدليس والغش",
        "description_ar": "تقديم معلومات مضللة أو كاذبة للمحكمة أو الموكل",
        "applicable_articles": ["Art39", "Art40"],
        "base_severity": "critical",
        "base_sanction_range": ["temp_suspension", "disbarment"],
    },
    "contempt_of_court": {
        "name_ar": "إهانة القضاء",
        "description_ar": "التصرف باحتقار أو عدم احترام تجاه المحكمة أو القضاة",
        "applicable_articles": ["Art40"],
        "base_severity": "high",
        "base_sanction_range": ["censure", "fine", "temp_suspension"],
    },
    "financial_misconduct": {
        "name_ar": "إساءة التصرف المالي",
        "description_ar": "التلاعب بأموال الموكل أو اختلاسها أو عدم تسليمها",
        "applicable_articles": ["Art40"],
        "base_severity": "critical",
        "base_sanction_range": ["temp_suspension", "disbarment"],
    },
    "conduct_violation": {
        "name_ar": "مخالفة آداب المهنة",
        "description_ar": "مخالفة قواعد السلوك المهني للمحامين",
        "applicable_articles": ["Art39", "Art40"],
        "base_severity": "low",
        "base_sanction_range": ["warning", "censure"],
    },
    "file_retention": {
        "name_ar": "الامتناع عن تسليم الملفات",
        "description_ar": "رفض تسليم ملفات وأوراق الموكل عند انتهاء الوكالة",
        "applicable_articles": ["Art40"],
        "base_severity": "medium",
        "base_sanction_range": ["censure", "fine"],
    },
    "false_representation": {
        "name_ar": "ادعاء صفة كاذبة",
        "description_ar": "ادعاء تخصص أو مؤهل غير موجود أو تضليل الموكل",
        "applicable_articles": ["Art39"],
        "base_severity": "high",
        "base_sanction_range": ["fine", "temp_suspension"],
    },
}

SANCTION_TYPES = {
    "warning": {
        "name_ar": "تنبيه",
        "description_ar": "إخطار رسمي بالمخالفة دون أثر علني",
        "severity_level": 1,
        "minister_approval_required": False,
    },
    "censure": {
        "name_ar": "لوم",
        "description_ar": "توبيخ رسمي يُدوَّن في السجل المهني",
        "severity_level": 2,
        "minister_approval_required": False,
    },
    "fine": {
        "name_ar": "غرامة مالية",
        "description_ar": "عقوبة مالية لا تزيد على خمسة آلاف ريال",
        "severity_level": 3,
        "max_amount_sar": 5000,
        "minister_approval_required": False,
    },
    "temp_suspension": {
        "name_ar": "وقف مؤقت عن مزاولة المهنة",
        "description_ar": "إيقاف المحامي عن العمل لمدة لا تزيد على سنة",
        "severity_level": 4,
        "max_duration_days": 365,
        "minister_approval_required": True,
    },
    "disbarment": {
        "name_ar": "شطب من جدول المحامين",
        "description_ar": "إلغاء القيد في جدول المحامين نهائياً",
        "severity_level": 5,
        "minister_approval_required": True,
    },
}
