import uuid
import math
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.investigation import InvestigationRecord, InvestigationInterview
from app.models.complaint import Complaint
from app.models.user import User
from app.schemas.investigation import (
    InvestigationCreate, InvestigationUpdate, InvestigationResponse,
    InterviewCreate, InterviewResponse,
)
from app.dependencies import get_current_user
from app.core.permissions import ADMIN, INVESTIGATOR, PROSECUTOR

router = APIRouter(prefix="/investigations", tags=["التحقيق"])


@router.post("", response_model=InvestigationResponse, status_code=status.HTTP_201_CREATED)
async def create_investigation(
    data: InvestigationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [ADMIN, INVESTIGATOR]:
        raise HTTPException(status_code=403, detail="غير مصرح")

    complaint = await db.get(Complaint, data.complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="الشكوى غير موجودة")

    investigation = InvestigationRecord(
        complaint_id=data.complaint_id,
        investigator_id=current_user.id if current_user.role == INVESTIGATOR else data.investigator_id,
        investigation_plan=data.investigation_plan,
        start_date=data.start_date,
        target_end_date=data.target_end_date,
        status="in_progress",
    )
    db.add(investigation)
    await db.commit()
    await db.refresh(investigation)
    return investigation


@router.get("", response_model=dict)
async def list_investigations(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    complaint_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(InvestigationRecord)

    if current_user.role == INVESTIGATOR:
        q = q.where(InvestigationRecord.investigator_id == current_user.id)
    elif current_user.role not in [ADMIN, PROSECUTOR]:
        raise HTTPException(status_code=403, detail="غير مصرح")

    if complaint_id:
        q = q.where(InvestigationRecord.complaint_id == complaint_id)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    q = q.offset((page - 1) * size).limit(size).order_by(InvestigationRecord.created_at.desc())
    items = (await db.execute(q)).scalars().all()

    return {"items": [_inv_dict(i) for i in items], "total": total, "page": page, "size": size, "pages": math.ceil(total / size) if total else 0}


@router.get("/{investigation_id}", response_model=dict)
async def get_investigation(
    investigation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv = await db.get(InvestigationRecord, investigation_id)
    if not inv:
        raise HTTPException(status_code=404, detail="سجل التحقيق غير موجود")
    if current_user.role == INVESTIGATOR and inv.investigator_id != current_user.id:
        raise HTTPException(status_code=403, detail="غير مصرح")
    return _inv_dict(inv)


@router.patch("/{investigation_id}", response_model=dict)
async def update_investigation(
    investigation_id: uuid.UUID,
    data: InvestigationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv = await db.get(InvestigationRecord, investigation_id)
    if not inv:
        raise HTTPException(status_code=404, detail="سجل التحقيق غير موجود")
    if current_user.role == INVESTIGATOR and inv.investigator_id != current_user.id:
        raise HTTPException(status_code=403, detail="غير مصرح")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(inv, field, value)
    await db.commit()
    await db.refresh(inv)
    return _inv_dict(inv)


@router.post("/{investigation_id}/close", response_model=dict)
async def close_investigation(
    investigation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """إغلاق التحقيق وتحويله للادعاء"""
    if current_user.role not in [ADMIN, INVESTIGATOR]:
        raise HTTPException(status_code=403, detail="غير مصرح")

    inv = await db.get(InvestigationRecord, investigation_id)
    if not inv:
        raise HTTPException(status_code=404, detail="سجل التحقيق غير موجود")
    if inv.status != "in_progress":
        raise HTTPException(status_code=400, detail="التحقيق ليس جارياً")

    inv.status = "completed"
    inv.actual_end_date = datetime.now(timezone.utc).date()

    # Advance complaint status
    complaint = await db.get(Complaint, inv.complaint_id)
    if complaint and complaint.status == "under_investigation":
        complaint.status = "indictment_prep"
        complaint.investigation_closed_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(inv)
    return _inv_dict(inv)


@router.post("/{investigation_id}/interviews", response_model=dict, status_code=201)
async def add_interview(
    investigation_id: uuid.UUID,
    data: InterviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [ADMIN, INVESTIGATOR]:
        raise HTTPException(status_code=403, detail="غير مصرح")

    inv = await db.get(InvestigationRecord, investigation_id)
    if not inv:
        raise HTTPException(status_code=404, detail="سجل التحقيق غير موجود")

    interview = InvestigationInterview(
        investigation_id=investigation_id,
        interviewee_name=data.interviewee_name,
        interviewee_role=data.interviewee_role,
        interview_date=data.interview_date,
        notes=data.notes,
        transcript=data.transcript,
    )
    db.add(interview)
    await db.commit()
    await db.refresh(interview)
    return {
        "id": str(interview.id),
        "investigation_id": str(interview.investigation_id),
        "interviewee_name": interview.interviewee_name,
        "interviewee_role": interview.interviewee_role,
        "interview_date": str(interview.interview_date),
        "notes": interview.notes,
        "transcript": interview.transcript,
        "created_at": str(interview.created_at),
    }


def _inv_dict(inv: InvestigationRecord) -> dict:
    return {
        "id": str(inv.id),
        "complaint_id": str(inv.complaint_id),
        "investigator_id": str(inv.investigator_id) if inv.investigator_id else None,
        "investigation_plan": inv.investigation_plan,
        "start_date": str(inv.start_date) if inv.start_date else None,
        "target_end_date": str(inv.target_end_date) if inv.target_end_date else None,
        "actual_end_date": str(inv.actual_end_date) if inv.actual_end_date else None,
        "summary": inv.summary,
        "findings": inv.findings,
        "is_violation_found": inv.is_violation_found,
        "recommended_action": inv.recommended_action,
        "status": inv.status,
        "created_at": str(inv.created_at),
        "updated_at": str(inv.updated_at),
    }
