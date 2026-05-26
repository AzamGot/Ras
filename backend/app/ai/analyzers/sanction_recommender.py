"""
محرك اقتراح العقوبات التأديبية
"""
import json
from app.ai.client import call_ai_json
from app.ai.legal_knowledge.saudi_law_m38_1422 import SANCTION_TYPES, VIOLATION_TYPES
from app.ai.legal_knowledge.executive_regulations_1446 import EXECUTIVE_REGULATIONS

PROMPT_VERSION = "v1.0"

AGGRAVATING_FACTORS = EXECUTIVE_REGULATIONS["aggravating_factors"]
MITIGATING_FACTORS = EXECUTIVE_REGULATIONS["mitigating_factors"]

SYSTEM_PROMPT = f"""أنت خبير في التأديب المهني للمحامين في المملكة العربية السعودية.
مهمتك اقتراح العقوبة التأديبية المناسبة وفق نظام المحاماة م/38 واللائحة التنفيذية 1446هـ.

العقوبات المتاحة (مرتبة تصاعدياً):
{json.dumps({k: {
    "name_ar": v["name_ar"],
    "severity_level": v["severity_level"],
    "minister_approval_required": v["minister_approval_required"]
} for k, v in SANCTION_TYPES.items()}, ensure_ascii=False, indent=2)}

الظروف المشددة وأوزانها:
{json.dumps(AGGRAVATING_FACTORS, ensure_ascii=False, indent=2)}

الظروف المخففة وأوزانها:
{json.dumps(MITIGATING_FACTORS, ensure_ascii=False, indent=2)}

مبادئ التأديب:
1. التناسب بين العقوبة وجسامة المخالفة
2. مراعاة الظروف المشددة والمخففة
3. الأخذ بمبدأ التدرج في العقوبات
4. حماية مصالح الموكلين والعدالة

ردك يجب أن يكون JSON فقط:
{{
  "recommended_sanction": "النوع من القائمة",
  "sanction_details": {{
    "duration_days": null_or_number,
    "fine_amount_sar": null_or_number,
    "conditions": []
  }},
  "requires_minister_approval": true|false,
  "legal_basis": ["المادة المستند إليها"],
  "aggravating_factors_found": [{{"factor": "...", "explanation": "..."}}],
  "mitigating_factors_found": [{{"factor": "...", "explanation": "..."}}],
  "alternative_sanction": "بديل أخف في حال تطبيق المخففات",
  "reasoning_ar": "التبرير القانوني التفصيلي",
  "confidence": 0.0-1.0
}}"""


async def recommend_sanction(
    violation_type: str,
    severity: str,
    lawyer_history: dict,
    aggravating_factors: list[str],
    mitigating_factors: list[str],
    complaint_description: str,
) -> dict:
    """اقتراح العقوبة التأديبية المناسبة"""

    violation_info = VIOLATION_TYPES.get(violation_type, {})

    messages = [
        {
            "role": "user",
            "content": f"""اقترح العقوبة التأديبية المناسبة للحالة التالية:

نوع المخالفة: {violation_info.get("name_ar", violation_type)}
خطورة المخالفة: {severity}
المواد المنتهكة: {", ".join(violation_info.get("applicable_articles", []))}

وصف المخالفة:
{complaint_description}

سجل المحامي:
- عدد الشكاوى السابقة: {lawyer_history.get("complaint_count", 0)}
- عدد المخالفات المثبتة: {lawyer_history.get("violation_count", 0)}
- هل سبق له عقوبة بنفس النوع: {"نعم" if lawyer_history.get("recidivism_flag") else "لا"}
- سنوات الممارسة: {lawyer_history.get("years_licensed", "غير محدد")}

الظروف المشددة المحددة: {", ".join(aggravating_factors) if aggravating_factors else "لا توجد"}
الظروف المخففة المحددة: {", ".join(mitigating_factors) if mitigating_factors else "لا توجد"}

اقترح العقوبة المناسبة مع التبرير القانوني الكامل."""
        }
    ]

    result, usage = await call_ai_json(SYSTEM_PROMPT, messages)
    result["prompt_version"] = PROMPT_VERSION
    result["tokens_used"] = usage.get("input_tokens", 0) + usage.get("output_tokens", 0)
    return result
