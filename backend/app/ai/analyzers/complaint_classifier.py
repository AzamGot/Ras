"""
تصنيف الشكاوى تلقائياً
"""
import json
from app.ai.client import call_ai_json
from app.ai.legal_knowledge.saudi_law_m38_1422 import VIOLATION_TYPES, LAWYERS_SYSTEM_ARTICLES
from app.ai.legal_knowledge.executive_regulations_1446 import EXECUTIVE_REGULATIONS
from app.ai.legal_knowledge.professional_conduct_rules import PROFESSIONAL_CONDUCT_RULES

PROMPT_VERSION = "v1.0"

SYSTEM_PROMPT = f"""أنت خبير قانوني متخصص في نظام المحاماة السعودي ومهمتك تصنيف الشكاوى المقدمة ضد المحامين.

الإطار النظامي الذي تعمل وفقه:
1. نظام المحاماة السعودي (م/38 لعام 1422هـ)
2. اللائحة التنفيذية لنظام المحاماة 1446هـ
3. قواعد السلوك المهني للمحامين

أنواع المخالفات المتاحة:
{json.dumps({k: v["name_ar"] for k, v in VIOLATION_TYPES.items()}, ensure_ascii=False, indent=2)}

درجات الخطورة: low (منخفضة) | medium (متوسطة) | high (عالية) | critical (حرجة)

قواعد التصنيف:
- الإفشاء المتعمد للأسرار: high أو critical
- التدليس والغش: critical دائماً
- الإخلال الخفيف بالواجبات: low أو medium
- الاختلاس المالي: critical
- انتهاك السرية غير المتعمد: medium

يجب أن يكون ردك JSON فقط بهذا الشكل الدقيق:
{{
  "violation_type": "النوع الرئيسي من القائمة",
  "violation_subtype": "وصف أكثر تحديداً",
  "severity": "low|medium|high|critical",
  "applicable_articles": ["رقم المادة", ...],
  "confidence": 0.0-1.0,
  "reasoning_ar": "شرح التصنيف بالعربية",
  "key_facts": ["واقعة مهمة 1", "واقعة مهمة 2"],
  "requires_urgent_attention": true|false
}}"""


async def classify_complaint(complaint_text: str, complaint_title: str = "") -> dict:
    """تصنيف الشكوى وتحديد نوع المخالفة وخطورتها"""
    messages = [
        {
            "role": "user",
            "content": f"""صنّف الشكوى التالية:

العنوان: {complaint_title}

النص الكامل:
{complaint_text}

أعطني تصنيفاً دقيقاً وفق الإطار النظامي السعودي المعتمد."""
        }
    ]

    result, usage = await call_ai_json(SYSTEM_PROMPT, messages)
    result["prompt_version"] = PROMPT_VERSION
    result["model"] = "claude-sonnet-4-6"
    result["tokens_used"] = usage.get("input_tokens", 0) + usage.get("output_tokens", 0)
    return result
