import uuid
from datetime import datetime, date
from pydantic import BaseModel
from typing import Optional


class InvestigationCreate(BaseModel):
    complaint_id: uuid.UUID
    investigator_id: Optional[uuid.UUID] = None
    investigation_plan: Optional[str] = None
    start_date: Optional[date] = None
    target_end_date: Optional[date] = None


class InvestigationUpdate(BaseModel):
    investigation_plan: Optional[str] = None
    summary: Optional[str] = None
    findings: Optional[str] = None
    is_violation_found: Optional[bool] = None
    recommended_action: Optional[str] = None
    target_end_date: Optional[date] = None
    status: Optional[str] = None


class InvestigationResponse(BaseModel):
    id: uuid.UUID
    complaint_id: uuid.UUID
    investigator_id: Optional[uuid.UUID] = None
    investigation_plan: Optional[str] = None
    start_date: Optional[date] = None
    target_end_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    summary: Optional[str] = None
    findings: Optional[str] = None
    is_violation_found: Optional[bool] = None
    recommended_action: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class InterviewCreate(BaseModel):
    interviewee_name: Optional[str] = None
    interviewee_role: Optional[str] = None
    interview_date: datetime
    notes: Optional[str] = None
    transcript: Optional[str] = None


class InterviewResponse(BaseModel):
    id: uuid.UUID
    investigation_id: uuid.UUID
    interviewee_name: Optional[str] = None
    interviewee_role: Optional[str] = None
    interview_date: datetime
    notes: Optional[str] = None
    transcript: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
