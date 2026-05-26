"""
تحليل مخاطر المحامي وإعطاؤه درجة مخاطر من 0 إلى 100
"""
from app.ai.client import call_ai_json

PROMPT_VERSION = "v1.0"

SYSTEM_PROMPT = """أنت محلل مخاطر قانوني متخصص في تقييم مخاطر المحامين استناداً لسجلاتهم المهنية.
مهمتك تحليل بيانات المحامي وتقديم درجة مخاطر شاملة.

معايير تقييم المخاطر:
1. عدد الشكاوى السابقة (30% من الوزن)
2. جسامة المخالفات السابقة (25% من الوزن)
3. التكرار في نفس نوع المخالفة (20% من الوزن)
4. المدة بين المخالفات (15% من الوزن)
5. نتائج القضايا السابقة (10% من الوزن)

مستويات المخاطر:
- 0-25: منخفضة (سجل نظيف)
- 26-50: معتدلة (بعض الملاحظات)
- 51-75: عالية (يستوجب المراقبة)
- 76-100: حرجة (يستوجب التدخل الفوري)

ردك يجب أن يكون JSON فقط:
{
  "risk_score": 0-100,
  "risk_level": "low|moderate|high|critical",
  "key_risk_factors": [{"factor": "...", "impact": "high|medium|low", "description": "..."}],
  "trend": "increasing|stable|decreasing",
  "recommended_monitoring": "استراتيجية المراقبة المقترحة",
  "alerts": ["تنبيه 1", "تنبيه 2"],
  "confidence": 0.0-1.0
}"""


async def compute_lawyer_risk_score(
    lawyer_profile: dict,
    complaint_history: list[dict],
    sanction_history: list[dict],
) -> dict:
    """احتساب درجة المخاطر للمحامي"""

    messages = [
        {
            "role": "user",
            "content": f"""احسب درجة المخاطر للمحامي التالي:

ملف المحامي:
- رقم الترخيص: {lawyer_profile.get("license_number", "غير متاح")}
- سنوات الترخيص: {lawyer_profile.get("years_licensed", "غير متاح")}
- الحالة الحالية: {lawyer_profile.get("status", "نشط")}
- عدد الشكاوى المسجلة: {len(complaint_history)}

تاريخ الشكاوى:
{chr(10).join([
    f"- [{c.get('date', '?')}] {c.get('violation_type', '?')} - النتيجة: {c.get('outcome', '?')} - الخطورة: {c.get('severity', '?')}"
    for c in complaint_history
]) if complaint_history else "لا توجد شكاوى سابقة"}

تاريخ العقوبات:
{chr(10).join([
    f"- [{s.get('date', '?')}] {s.get('sanction_type', '?')}"
    for s in sanction_history
]) if sanction_history else "لا توجد عقوبات سابقة"}

قدّم تقييماً شاملاً لدرجة المخاطر."""
        }
    ]

    result, usage = await call_ai_json(SYSTEM_PROMPT, messages)
    result["prompt_version"] = PROMPT_VERSION
    result["tokens_used"] = usage.get("input_tokens", 0) + usage.get("output_tokens", 0)
    return result
