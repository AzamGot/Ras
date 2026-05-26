import uuid
import math
import random
from datetime import datetime, timezone, date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.disciplinary import DisciplinarySession, Decision, SanctionExecution, Appeal
from app.models.complaint import Complaint
from app.models.user import User
from app.dependencies import get_current_user
from app.core.permissions import ADMIN, COMMITTEE_ROLES, EXECUTOR
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/disciplinary", tags=["التأديب"])


# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class SessionCreate(BaseModel):
    complaint_id: uuid.UUID
    indictment_id: Optional[uuid.UUID] = None
    session_number: int = 1
    scheduled_date: datetime
    location: Optional[str] = None
    is_virtual: bool = False
    virtual_link: Optional[str] = None
    agenda: Optional[str] = None


class SessionUpdate(BaseModel):
    actual_date: Optional[datetime] = None
    complainant_present: Optional[bool] = None
    respondent_present: Optional[bool] = None
    minutes: Optional[str] = None
    session_outcome: Optional[str] = None
    status: Optional[str] = None
    postponement_reason: Optional[str] = None


class DecisionCreate(BaseModel):
    complaint_id: uuid.UUID
    session_id: Optional[uuid.UUID] = None
    indictment_id: Optional[uuid.UUID] = None
    decision_date: date
    is_guilty: bool
    verdict_text: str
    reasoning: str
    sanction_type: Optional[str] = None
    sanction_details: Optional[dict] = None
    aggravating_factors: list[dict] = []
    mitigating_factors: list[dict] = []
    requires_minister_approval: bool = False


class AppealCreate(BaseModel):
    decision_id: uuid.UUID
    appeal_date: date
    grounds: str


class ExecutionCreate(BaseModel):
    decision_id: uuid.UUID
    execution_date: Optional[date] = None
    execution_method: Optional[str] = None
    execution_notes: Optional[str] = None
    fine_amount: Optional[float] = None


# ── Sessions ──────────────────────────────────────────────────────────────────

def _session_dict(s: DisciplinarySession) -> dict:
    return {
        "id": str(s.id),
        "complaint_id": str(s.complaint_id),
        "indictment_id": str(s.indictment_id) if s.indictment_id else None,
        "session_number": s.session_number,
        "scheduled_date": str(s.scheduled_date),
        "actual_date": str(s.actual_date) if s.actual_date else None,
        "location": s.location,
        "is_virtual": s.is_virtual,
        "chair_id": str(s.chair_id) if s.chair_id else None,
        "complainant_present": s.complainant_present,
        "respondent_present": s.respondent_present,
        "agenda": s.agenda,
        "minutes": s.minutes,
        "session_outcome": s.session_outcome,
        "status": s.status,
        "created_at": str(s.created_at),
    }


@router.post("/sessions", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_session(
    data: SessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [ADMIN] + list(COMMITTEE_ROLES):
        raise HTTPException(status_code=403, detail="غير مصرح")

    complaint = await db.get(Complaint, data.complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="الشكوى غير موجودة")

    session = DisciplinarySession(
        complaint_id=data.complaint_id,
        indictment_id=data.indictment_id,
        session_number=data.session_number,
        scheduled_date=data.scheduled_date,
        location=data.location,
        is_virtual=data.is_virtual,
        virtual_link=data.virtual_link,
        chair_id=current_user.id if current_user.role in COMMITTEE_ROLES else None,
        agenda=data.agenda,
        status="scheduled",
    )
    db.add(session)

    if complaint.status == "referred_to_committee":
        complaint.status = "sessions_ongoing"

    await db.commit()
    await db.refresh(session)
    return _session_dict(session)


@router.get("/sessions", response_model=dict)
async def list_sessions(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    complaint_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [ADMIN] + list(COMMITTEE_ROLES):
        raise HTTPException(status_code=403, detail="غير مصرح")

    q = select(DisciplinarySession)
    if complaint_id:
        q = q.where(DisciplinarySession.complaint_id == complaint_id)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    q = q.offset((page - 1) * size).limit(size).order_by(DisciplinarySession.scheduled_date.desc())
    items = (await db.execute(q)).scalars().all()
    return {"items": [_session_dict(s) for s in items], "total": total, "page": page, "size": size, "pages": math.ceil(total / size) if total else 0}


@router.get("/sessions/{session_id}", response_model=dict)
async def get_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    s = await db.get(DisciplinarySession, session_id)
    if not s:
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة")
    return _session_dict(s)


@router.patch("/sessions/{session_id}", response_model=dict)
async def update_session(
    session_id: uuid.UUID,
    data: SessionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [ADMIN] + list(COMMITTEE_ROLES):
        raise HTTPException(status_code=403, detail="غير مصرح")

    s = await db.get(DisciplinarySession, session_id)
    if not s:
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(s, field, value)
    await db.commit()
    await db.refresh(s)
    return _session_dict(s)


# ── Decisions ─────────────────────────────────────────────────────────────────

def _decision_dict(d: Decision) -> dict:
    return {
        "id": str(d.id),
        "complaint_id": str(d.complaint_id),
        "session_id": str(d.session_id) if d.session_id else None,
        "indictment_id": str(d.indictment_id) if d.indictment_id else None,
        "decision_number": d.decision_number,
        "decision_date": str(d.decision_date),
        "is_guilty": d.is_guilty,
        "verdict_text": d.verdict_text,
        "reasoning": d.reasoning,
        "sanction_type": d.sanction_type,
        "sanction_details": d.sanction_details,
        "aggravating_factors": d.aggravating_factors,
        "mitigating_factors": d.mitigating_factors,
        "requires_minister_approval": d.requires_minister_approval,
        "minister_approval_status": d.minister_approval_status,
        "chair_signed": d.chair_signed,
        "status": d.status,
        "is_final": d.is_final,
        "appeal_deadline": str(d.appeal_deadline) if d.appeal_deadline else None,
        "created_at": str(d.created_at),
    }


@router.post("/decisions", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_decision(
    data: DecisionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [ADMIN] + list(COMMITTEE_ROLES):
        raise HTTPException(status_code=403, detail="غير مصرح")

    complaint = await db.get(Complaint, data.complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="الشكوى غير موجودة")

    year = datetime.now().year
    decision_number = f"DEC-{year}-{random.randint(10000, 99999)}"

    from datetime import timedelta
    appeal_deadline = data.decision_date + timedelta(days=60) if data.decision_date else None

    decision = Decision(
        complaint_id=data.complaint_id,
        session_id=data.session_id,
        indictment_id=data.indictment_id,
        decision_number=decision_number,
        decision_date=data.decision_date,
        is_guilty=data.is_guilty,
        verdict_text=data.verdict_text,
        reasoning=data.reasoning,
        sanction_type=data.sanction_type,
        sanction_details=data.sanction_details,
        aggravating_factors=data.aggravating_factors,
        mitigating_factors=data.mitigating_factors,
        requires_minister_approval=data.requires_minister_approval,
        appeal_deadline=appeal_deadline,
        status="draft",
    )
    db.add(decision)

    complaint.status = "decision_issued"
    complaint.decision_issued_at = datetime.now(timezone.utc)
    if data.requires_minister_approval:
        complaint.minister_approval_required = True

    await db.commit()
    await db.refresh(decision)
    return _decision_dict(decision)


@router.get("/decisions", response_model=dict)
async def list_decisions(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    complaint_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    allowed = [ADMIN, EXECUTOR] + list(COMMITTEE_ROLES)
    if current_user.role not in allowed:
        raise HTTPException(status_code=403, detail="غير مصرح")

    q = select(Decision)
    if complaint_id:
        q = q.where(Decision.complaint_id == complaint_id)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    q = q.offset((page - 1) * size).limit(size).order_by(Decision.created_at.desc())
    items = (await db.execute(q)).scalars().all()
    return {"items": [_decision_dict(d) for d in items], "total": total, "page": page, "size": size, "pages": math.ceil(total / size) if total else 0}


@router.get("/decisions/{decision_id}", response_model=dict)
async def get_decision(
    decision_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    d = await db.get(Decision, decision_id)
    if not d:
        raise HTTPException(status_code=404, detail="القرار غير موجود")
    return _decision_dict(d)


@router.post("/decisions/{decision_id}/minister-approve", response_model=dict)
async def minister_approve(
    decision_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """تسجيل موافقة الوزير على القرار"""
    if current_user.role != ADMIN:
        raise HTTPException(status_code=403, detail="غير مصرح")

    d = await db.get(Decision, decision_id)
    if not d:
        raise HTTPException(status_code=404, detail="القرار غير موجود")
    if not d.requires_minister_approval:
        raise HTTPException(status_code=400, detail="القرار لا يحتاج موافقة وزارية")

    d.minister_approval_status = "approved"
    d.minister_approval_date = datetime.now(timezone.utc)
    d.status = "in_effect"
    d.is_final = True

    complaint = await db.get(Complaint, d.complaint_id)
    if complaint:
        complaint.status = "in_effect"

    await db.commit()
    await db.refresh(d)
    return _decision_dict(d)


# ── Appeals ───────────────────────────────────────────────────────────────────

@router.post("/appeals", response_model=dict, status_code=status.HTTP_201_CREATED)
async def file_appeal(
    data: AppealCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    d = await db.get(Decision, data.decision_id)
    if not d:
        raise HTTPException(status_code=404, detail="القرار غير موجود")

    if d.appeal_deadline and data.appeal_date > d.appeal_deadline:
        raise HTTPException(status_code=400, detail="انتهت مدة الطعن (60 يوماً)")

    appeal = Appeal(
        decision_id=data.decision_id,
        appellant_id=current_user.id,
        appeal_date=data.appeal_date,
        grounds=data.grounds,
        status="filed",
    )
    db.add(appeal)

    complaint = await db.get(Complaint, d.complaint_id)
    if complaint and complaint.status == "in_effect":
        complaint.status = "appealed"

    await db.commit()
    await db.refresh(appeal)
    return {
        "id": str(appeal.id),
        "decision_id": str(appeal.decision_id),
        "appellant_id": str(appeal.appellant_id) if appeal.appellant_id else None,
        "appeal_date": str(appeal.appeal_date),
        "grounds": appeal.grounds,
        "status": appeal.status,
        "created_at": str(appeal.created_at),
    }


# ── Execution ─────────────────────────────────────────────────────────────────

@router.post("/executions", response_model=dict, status_code=status.HTTP_201_CREATED)
async def record_execution(
    data: ExecutionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [ADMIN, EXECUTOR]:
        raise HTTPException(status_code=403, detail="غير مصرح")

    d = await db.get(Decision, data.decision_id)
    if not d:
        raise HTTPException(status_code=404, detail="القرار غير موجود")

    execution = SanctionExecution(
        decision_id=data.decision_id,
        executor_id=current_user.id,
        execution_date=data.execution_date,
        execution_method=data.execution_method,
        execution_notes=data.execution_notes,
        fine_amount=data.fine_amount,
        status="completed" if data.execution_date else "pending",
        completed_at=datetime.now(timezone.utc) if data.execution_date else None,
    )
    db.add(execution)

    complaint = await db.get(Complaint, d.complaint_id)
    if complaint and data.execution_date:
        complaint.status = "executed"

    await db.commit()
    await db.refresh(execution)
    return {
        "id": str(execution.id),
        "decision_id": str(execution.decision_id),
        "executor_id": str(execution.executor_id) if execution.executor_id else None,
        "execution_date": str(execution.execution_date) if execution.execution_date else None,
        "execution_method": execution.execution_method,
        "fine_amount": str(execution.fine_amount) if execution.fine_amount else None,
        "status": execution.status,
        "created_at": str(execution.created_at),
    }
