import uuid
import math
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.lawyer import Lawyer
from app.models.complaint import Complaint
from app.models.user import User
from app.dependencies import get_current_user
from app.core.permissions import ADMIN, STAFF_ROLES
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/lawyers", tags=["المحامون"])


class LawyerCreate(BaseModel):
    license_number: str
    bar_registration_date: str  # YYYY-MM-DD
    license_type: str = "مزاول"
    specialization: Optional[str] = None
    office_name: Optional[str] = None
    office_city: Optional[str] = None
    user_id: Optional[uuid.UUID] = None


class LawyerUpdate(BaseModel):
    specialization: Optional[str] = None
    office_name: Optional[str] = None
    office_city: Optional[str] = None
    office_address: Optional[str] = None
    is_suspended: Optional[bool] = None
    suspension_start: Optional[str] = None
    suspension_end: Optional[str] = None


def _lawyer_dict(l: Lawyer) -> dict:
    status_val = "disbarred" if l.is_struck_off else "suspended" if l.is_suspended else "active"
    return {
        "id": str(l.id),
        "user_id": str(l.user_id) if l.user_id else None,
        "license_number": l.license_number,
        "bar_registration_date": str(l.bar_registration_date),
        "license_type": l.license_type,
        "specialization": l.specialization,
        "office_name": l.office_name,
        "office_city": l.office_city,
        "status": status_val,
        "is_suspended": l.is_suspended,
        "is_struck_off": l.is_struck_off,
        "risk_score": float(l.risk_score) if l.risk_score is not None else None,
        "ai_risk_factors": l.ai_risk_factors,
        "complaint_count": l.complaint_count,
        "violation_count": l.violation_count,
        "recidivism_flag": l.recidivism_flag,
        "created_at": str(l.created_at),
        "updated_at": str(l.updated_at),
    }


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_lawyer(
    data: LawyerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != ADMIN:
        raise HTTPException(status_code=403, detail="غير مصرح")

    from datetime import date
    lawyer = Lawyer(
        license_number=data.license_number,
        bar_registration_date=date.fromisoformat(data.bar_registration_date),
        license_type=data.license_type,
        specialization=data.specialization,
        office_name=data.office_name,
        office_city=data.office_city,
        user_id=data.user_id,
    )
    db.add(lawyer)
    await db.commit()
    await db.refresh(lawyer)
    return _lawyer_dict(lawyer)


@router.get("", response_model=dict)
async def list_lawyers(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(Lawyer)

    if search:
        q = q.where(Lawyer.license_number.ilike(f"%{search}%"))
    if status_filter == "suspended":
        q = q.where(Lawyer.is_suspended == True, Lawyer.is_struck_off == False)
    elif status_filter == "disbarred":
        q = q.where(Lawyer.is_struck_off == True)
    elif status_filter == "active":
        q = q.where(Lawyer.is_suspended == False, Lawyer.is_struck_off == False)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    q = q.offset((page - 1) * size).limit(size).order_by(Lawyer.risk_score.desc())
    items = (await db.execute(q)).scalars().all()

    return {
        "items": [_lawyer_dict(l) for l in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": math.ceil(total / size) if total else 0,
    }


@router.get("/{lawyer_id}", response_model=dict)
async def get_lawyer(
    lawyer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    l = await db.get(Lawyer, lawyer_id)
    if not l:
        raise HTTPException(status_code=404, detail="المحامي غير موجود")
    return _lawyer_dict(l)


@router.patch("/{lawyer_id}", response_model=dict)
async def update_lawyer(
    lawyer_id: uuid.UUID,
    data: LawyerUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != ADMIN:
        raise HTTPException(status_code=403, detail="غير مصرح")

    l = await db.get(Lawyer, lawyer_id)
    if not l:
        raise HTTPException(status_code=404, detail="المحامي غير موجود")

    from datetime import date
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field in ("suspension_start", "suspension_end") and value:
            value = date.fromisoformat(value)
        setattr(l, field, value)

    await db.commit()
    await db.refresh(l)
    return _lawyer_dict(l)


@router.get("/{lawyer_id}/complaints", response_model=dict)
async def get_lawyer_complaints(
    lawyer_id: uuid.UUID,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="غير مصرح")

    l = await db.get(Lawyer, lawyer_id)
    if not l:
        raise HTTPException(status_code=404, detail="المحامي غير موجود")

    q = select(Complaint).where(Complaint.respondent_lawyer_id == lawyer_id)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    q = q.offset((page - 1) * size).limit(size).order_by(Complaint.created_at.desc())
    items = (await db.execute(q)).scalars().all()

    return {
        "items": [
            {
                "id": str(c.id),
                "reference_number": c.reference_number,
                "title": c.title,
                "status": c.status,
                "severity": c.severity,
                "violation_type": c.violation_type,
                "filing_date": str(c.filing_date) if c.filing_date else None,
            }
            for c in items
        ],
        "total": total,
        "page": page,
        "size": size,
        "pages": math.ceil(total / size) if total else 0,
    }
