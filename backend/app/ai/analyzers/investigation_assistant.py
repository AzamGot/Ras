"""
مساعد التحقيق - يولّد أسئلة التحقيق ويدعم صياغة لوائح الادعاء والقرارات
"""
from app.ai.client import call_ai_json, call_ai
from app.ai.legal_knowledge.saudi_law_m38_1422 import VIOLATION_TYPES, LAWYERS_SYSTEM_ARTICLES
from app.ai.legal_knowledge.executive_regulations_1446 import EXECUTIVE_REGULATIONS
from app.ai.legal_knowledge.professional_conduct_rules import PROFESSIONAL_CONDUCT_RULES

PROMPT_VERSION = "v1.0"


async def generate_investigation_questions(
    complaint_description: str,
    violation_type: str,
    evidence_summary: str,
    target_party: str,  # "complainant" or "respondent" or "witness"
) -> dict:
    """توليد أسئلة التحقيق المناسبة"""

    violation_info = VIOLATION_TYPES.get(violation_type, {})
    target_label = {
        "complainant": "المشتكي (الموكل)",
        "respondent": "المحامي المشتكى عليه",
        "witness": "الشاهد",
    }.get(target_party, target_party)

    system = f"""أنت محقق قانوني متخصص في التحقيق بمخالفات المحامين في المملكة العربية السعودية.
مهمتك إعداد قائمة أسئلة تحقيق مهنية ودقيقة وفق الأطر النظامية المعتمدة.

القواعد:
1. الأسئلة يجب أن تكون مفتوحة وتفصيلية
2. مرتبة من العامة إلى الخاصة
3. تتناول جميع عناصر المخالفة المزعومة
4. تهدف إلى الكشف عن الحقيقة بشكل موضوعي
5. مصاغة بلغة قانونية رسمية ومحترمة

نوع المخالفة: {violation_info.get("name_ar", violation_type)}

يجب أن يكون ردك JSON:
{{
  "target_party": "الطرف المستجوَب",
  "questions": [
    {{
      "number": 1,
      "question": "نص السؤال",
      "purpose": "الهدف من السؤال",
      "follow_up": "سؤال متابعة محتمل"
    }}
  ],
  "key_evidence_to_request": ["دليل 1", "دليل 2"],
  "legal_elements_to_establish": ["عنصر قانوني 1", "عنصر قانوني 2"]
}}"""

    messages = [
        {
            "role": "user",
            "content": f"""أعدّ أسئلة تحقيق للاستجواب مع: {target_label}

وقائع الشكوى:
{complaint_description}

نوع المخالفة: {violation_info.get("name_ar", violation_type)}

الأدلة المتوفرة حتى الآن:
{evidence_summary if evidence_summary else "لا توجد أدلة محددة بعد"}

أعطني 10-15 سؤالاً تحقيقياً شاملاً."""
        }
    ]

    result, usage = await call_ai_json(system, messages, max_tokens=6000)
    result["prompt_version"] = PROMPT_VERSION
    return result


async def draft_indictment(
    complaint_data: dict,
    investigation_findings: str,
    charges: list[dict],
    lawyer_profile: dict,
) -> dict:
    """مسوّدة لائحة الادعاء"""

    system = """أنت مدعٍ عام متخصص في قضايا تأديب المحامين في المملكة العربية السعودية.
مهمتك إعداد لائحة ادعاء رسمية وفق نظام المحاماة م/38 واللائحة التنفيذية 1446هـ.

هيكل لائحة الادعاء:
1. المقدمة: تعريف بالطرفين ورقم القضية
2. الوقائع: سرد منظم للوقائع مؤرخاً
3. التهم: تحديد كل تهمة مع المادة النظامية المنتهكة
4. الأدلة: ذكر الأدلة الداعمة لكل تهمة
5. الطلبات: العقوبة المقترحة مع الأساس القانوني

الأسلوب: قانوني رسمي، موضوعي، مستند إلى الأدلة

ردك يجب JSON:
{
  "document_title": "عنوان اللائحة",
  "introduction": "نص المقدمة",
  "facts_section": "سرد الوقائع",
  "charges": [
    {
      "charge_number": 1,
      "charge_text": "نص التهمة الرسمي",
      "applicable_article": "المادة المنتهكة",
      "supporting_evidence": ["دليل 1"]
    }
  ],
  "legal_analysis": "التحليل القانوني",
  "prosecution_request": "طلبات الادعاء",
  "full_document": "نص اللائحة الكاملة الرسمي"
}"""

    messages = [
        {
            "role": "user",
            "content": f"""أعدّ لائحة ادعاء للقضية التالية:

رقم الشكوى: {complaint_data.get("reference_number", "غير محدد")}
المحامي المشتكى عليه: {lawyer_profile.get("name", "غير محدد")} - رقم الترخيص: {lawyer_profile.get("license_number", "غير محدد")}

نتائج التحقيق:
{investigation_findings}

التهم الموجهة:
{chr(10).join([f"- {c.get('description', '')} (المادة: {c.get('applicable_article', '')})" for c in charges])}

أعدّ لائحة ادعاء رسمية كاملة."""
        }
    ]

    result, usage = await call_ai_json(system, messages, max_tokens=6000)
    result["prompt_version"] = PROMPT_VERSION
    return result


async def draft_disciplinary_decision(
    complaint_data: dict,
    session_minutes: str,
    charges: list[dict],
    lawyer_profile: dict,
    aggravating_factors: list[dict],
    mitigating_factors: list[dict],
    recommended_sanction: str,
) -> dict:
    """مسوّدة القرار التأديبي"""

    system = """أنت رئيس لجنة تأديب متخصصة في شؤون المحامين في المملكة العربية السعودية.
مهمتك صياغة قرار تأديبي رسمي وفق نظام المحاماة م/38.

هيكل القرار التأديبي:
1. الديباجة: بسم الله، وتاريخ الجلسة، وأعضاء اللجنة
2. بعد الاطلاع: الإشارة إلى الشكوى ولائحة الادعاء
3. الإجراءات: ملخص إجراءات الجلسة
4. الوقائع الثابتة: ما ثبت من وقائع
5. الأسباب القانونية: التكييف القانوني
6. الظروف المشددة والمخففة
7. المنطوق: القرار الصريح

ردك يجب JSON:
{
  "preamble": "الديباجة الرسمية",
  "review_section": "قسم بعد الاطلاع",
  "proceedings_summary": "ملخص الإجراءات",
  "established_facts": "الوقائع الثابتة",
  "legal_grounds": "الأسباب القانونية",
  "circumstances_analysis": "تحليل الظروف",
  "verdict": "إدانة|براءة",
  "operative_clause": "منطوق القرار الصريح",
  "full_decision": "نص القرار الكامل الرسمي",
  "requires_minister_approval": true|false
}"""

    messages = [
        {
            "role": "user",
            "content": f"""أصِغ مشروع قرار تأديبي للقضية التالية:

رقم القضية: {complaint_data.get("reference_number", "غير محدد")}
المحامي: {lawyer_profile.get("name", "غير محدد")}

محضر الجلسة:
{session_minutes}

التهم الموجهة:
{chr(10).join([f"- {c.get('charge_text', c.get('description', ''))}" for c in charges])}

الظروف المشددة: {", ".join([f.get("factor", "") for f in aggravating_factors]) or "لا توجد"}
الظروف المخففة: {", ".join([f.get("factor", "") for f in mitigating_factors]) or "لا توجد"}
العقوبة المقترحة: {recommended_sanction}

أصِغ مشروع قرار تأديبي رسمياً وكاملاً."""
        }
    ]

    result, usage = await call_ai_json(system, messages, max_tokens=6000)
    result["prompt_version"] = PROMPT_VERSION
    return result


async def review_document_compliance(
    document_text: str,
    document_type: str,  # "indictment", "decision", "investigation_report"
) -> dict:
    """مراجعة الاتساق النظامي للوثيقة"""

    doc_type_ar = {
        "indictment": "لائحة الادعاء",
        "decision": "القرار التأديبي",
        "investigation_report": "تقرير التحقيق",
    }.get(document_type, document_type)

    system = """أنت مراجع قانوني متخصص في التدقيق على مطابقة الوثائق القانونية للأنظمة السعودية.
مهمتك فحص الوثيقة وتحديد الثغرات القانونية أو الإجرائية.

معايير المراجعة:
1. الاستناد الصحيح للمواد النظامية
2. اكتمال العناصر الإجرائية المطلوبة
3. دقة التكييف القانوني
4. وضوح الصياغة وخلوها من الغموض
5. توافق العقوبة مع درجة المخالفة

ردك يجب JSON:
{
  "overall_compliance": "compliant|minor_issues|major_issues|non_compliant",
  "compliance_score": 0-100,
  "issues": [
    {
      "severity": "critical|major|minor",
      "issue": "وصف المشكلة",
      "location": "موضع المشكلة في الوثيقة",
      "recommendation": "التوصية لإصلاحها"
    }
  ],
  "missing_elements": ["عنصر مفقود 1"],
  "strengths": ["نقطة قوة 1"],
  "summary_ar": "ملخص تقييم الوثيقة"
}"""

    messages = [
        {
            "role": "user",
            "content": f"""راجع {doc_type_ar} التالية وتحقق من مطابقتها للأنظمة السعودية:

{document_text}

أعطني تقييماً شاملاً للامتثال النظامي."""
        }
    ]

    result, usage = await call_ai_json(system, messages, max_tokens=3000)
    result["prompt_version"] = PROMPT_VERSION
    return result
