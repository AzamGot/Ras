"""
آلة حالة دورة حياة الشكوى - تحكم في التحولات المسموح بها
"""
from datetime import datetime, timezone

VALID_TRANSITIONS = {
    "draft": ["submitted"],
    "submitted": ["registered", "rejected"],
    "registered": ["under_investigation"],
    "under_investigation": ["indictment_prep", "closed"],
    "indictment_prep": ["referred_to_committee"],
    "referred_to_committee": ["sessions_ongoing"],
    "sessions_ongoing": ["decision_issued"],
    "decision_issued": ["pending_minister", "in_effect"],
    "pending_minister": ["in_effect", "returned"],
    "in_effect": ["appealed", "executed"],
    "appealed": ["executed", "closed"],
    "executed": ["closed"],
    "returned": ["sessions_ongoing"],
    "rejected": [],
    "closed": [],
}


def can_transition(current_status: str, new_status: str) -> bool:
    """تحقق من صحة الانتقال بين الحالات"""
    return new_status in VALID_TRANSITIONS.get(current_status, [])


def apply_transition(complaint, new_status: str, changed_by_id=None) -> None:
    """تطبيق الانتقال وتسجيل الطوابع الزمنية"""
    if not can_transition(complaint.status, new_status):
        raise ValueError(f"لا يمكن الانتقال من '{complaint.status}' إلى '{new_status}'")

    now = datetime.now(timezone.utc)

    if new_status == "registered":
        complaint.registered_at = now
    elif new_status == "under_investigation":
        complaint.investigation_started_at = now
    elif new_status in ("indictment_prep", "closed") and complaint.status == "under_investigation":
        complaint.investigation_closed_at = now
    elif new_status == "referred_to_committee":
        complaint.referred_to_committee_at = now
    elif new_status == "decision_issued":
        complaint.decision_issued_at = now
    elif new_status in ("in_effect", "pending_minister") and complaint.status == "decision_issued":
        if new_status == "pending_minister":
            complaint.minister_approval_required = True
    elif new_status == "closed":
        complaint.closed_at = now

    complaint.status = new_status
