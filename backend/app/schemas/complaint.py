import uuid
from datetime import datetime, date
from typing import Optional, Any
from pydantic import BaseModel


class ComplaintCreate(BaseModel):
    respondent_lawyer_id: Optional[uuid.UUID] = None
    title: str
    description: str
    incident_date: Optional[date] = None
    is_confidential: bool = False


class ComplaintUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    violation_type: Optional[str] = None
    violation_subtype: Optional[str] = None
    severity: Optional[str] = None
    applicable_articles: Optional[list] = None


class ComplaintFormalCheck(BaseModel):
    passed: bool
    notes: Optional[str] = None


class ComplaintAssignInvestigator(BaseModel):
    investigator_id: uuid.UUID


class ComplaintResponse(BaseModel):
    id: uuid.UUID
    reference_number: str
    title: str
    description: str
    status: str
    violation_type: Optional[str] = None
    severity: Optional[str] = None
    filing_date: datetime
    ai_classification: Optional[dict] = None
    complainant_id: Optional[uuid.UUID] = None
    respondent_lawyer_id: Optional[uuid.UUID] = None
    assigned_investigator_id: Optional[uuid.UUID] = None
    assigned_prosecutor_id: Optional[uuid.UUID] = None
    minister_approval_required: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ComplaintListResponse(BaseModel):
    items: list[ComplaintResponse]
    total: int
    page: int
    size: int
    pages: int
