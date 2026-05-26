from typing import Callable
from fastapi import HTTPException, status

# Role constants
COMPLAINANT = "complainant"
LAWYER = "lawyer"
INVESTIGATOR = "investigator"
PROSECUTOR = "prosecutor"
COMMITTEE_MEMBER = "committee_member"
COMMITTEE_CHAIR = "committee_chair"
EXECUTOR = "executor"
ADMIN = "admin"

ALL_ROLES = [COMPLAINANT, LAWYER, INVESTIGATOR, PROSECUTOR, COMMITTEE_MEMBER, COMMITTEE_CHAIR, EXECUTOR, ADMIN]
STAFF_ROLES = [INVESTIGATOR, PROSECUTOR, COMMITTEE_MEMBER, COMMITTEE_CHAIR, EXECUTOR, ADMIN]
COMMITTEE_ROLES = [COMMITTEE_MEMBER, COMMITTEE_CHAIR, ADMIN]
ADMIN_ROLES = [ADMIN]


def require_roles(*allowed_roles: str) -> Callable:
    def checker(current_user):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ليس لديك صلاحية للوصول إلى هذا المورد"
            )
        return current_user
    return checker


def is_admin(user) -> bool:
    return user.role == ADMIN


def is_staff(user) -> bool:
    return user.role in STAFF_ROLES


def can_view_complaint(user, complaint) -> bool:
    """Check if a user can view a specific complaint"""
    if user.role == ADMIN:
        return True
    if user.role == COMPLAINANT:
        return str(complaint.complainant_id) == str(user.id)
    if user.role == LAWYER:
        if complaint.respondent_lawyer and str(complaint.respondent_lawyer.user_id) == str(user.id):
            return complaint.status not in ["draft", "submitted"]
        return False
    if user.role == INVESTIGATOR:
        return str(complaint.assigned_investigator_id) == str(user.id)
    if user.role == PROSECUTOR:
        return str(complaint.assigned_prosecutor_id) == str(user.id)
    if user.role in COMMITTEE_ROLES:
        return complaint.status in [
            "referred_to_committee", "sessions_ongoing",
            "decision_issued", "pending_minister", "in_effect",
            "appealed", "executed", "closed"
        ]
    if user.role == EXECUTOR:
        return complaint.status in ["in_effect", "executed"]
    return False
