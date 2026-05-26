import uuid
import math
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.indictment import Indictment
from app.models.complaint import Complaint
from app.models.lawyer import Lawyer
from app.models.user import User
from app.dependencies import get_current_user
from app.core.permissions import ADMIN, PROSECUTOR, COMMITTEE_ROLES
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/indictments", tags=["لوائح الادعاء"])


class IndictmentCreate(BaseModel):
    complaint_id: uuid.UUID
    investigation_id: Optional[uuid.UUID] = None
    title: Optional[str] = None
    charges: list[dict] = []
    full_text: str
    aggravating_factors: list[dict] = []
    mitigating_factors: list[dict] = []
    prosecutor_sanction_rec: Optional[str] = None


class IndictmentUpdate(BaseModel):
    title: Optional[str] = None
    charges: Optional[list[dict]] = None
    full_text: Optional[str] = None
    aggravating_factors: Optional[list[dict]] = None
    mitigating_factors: Optional[list[dict]] = None
    prosecutor_sanction_rec: Optional[str] = None


def _ind_dict(ind: Indictment) -> dict:
    return {
        "id": str(ind.id),
        "complaint_id": str(ind.complaint_id),
        "prosecutor_id": str(ind.prosecutor_id) if ind.prosecutor_id else None,
        "investigation_id": str(ind.investigation_id) if ind.investigation_id else None,
        "document_number": ind.document_number,
        "title": ind.title,
        "charges": ind.charges,
        "full_text": ind.full_text,
        "aggravating_factors": ind.aggravating_factors,
        "mitigating_factors": ind.mitigating_factors,
        "ai_sanction_suggestion": ind.ai_sanction_suggestion,
        "prosecutor_sanction_rec": ind.prosecutor_sanction_rec,
        "status": ind.status,
        "finalized_at": str(ind.finalized_at) if ind.finalized_at else None,
        "referred_at": str(ind.referred_at) if ind.referred_at else None,
        "created_at": str(ind.created_at),
        "updated_at": str(ind.updated_at),
    }


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_indictment(
    data: IndictmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [ADMIN, PROSECUTOR]:
        raise HTTPException(status_code=403, detail="غير مصرح")

    complaint = await db.get(Complaint, data.complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="الشكوى غير موجودة")
    if complaint.status not in ["indictment_prep", "under_investigation"]:
        raise HTTPException(status_code=400, detail="الشكوى ليست في مرحلة إعداد لائحة الادعاء")

    from datetime import datetime
    import random
    year = datetime.now().year
    doc_number = f"IND-{year}-{random.randint(10000, 99999)}"

    indictment = Indictment(
        complaint_id=data.complaint_id,
        prosecutor_id=current_user.id if current_user.role == PROSECUTOR else None,
        investigation_id=data.investigation_id,
        document_number=doc_number,
        title=data.title,
        charges=data.charges,
        full_text=data.full_text,
        aggravating_factors=data.aggravating_factors,
        mitigating_factors=data.mitigating_factors,
        prosecutor_sanction_rec=data.prosecutor_sanction_rec,
        status="draft",
    )
    db.add(indictment)
    await db.commit()
    await db.refresh(indictment)
    return _ind_dict(indictment)


@router.get("", response_model=dict)
async def list_indictments(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    complaint_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(Indictment)
    if current_user.role == PROSECUTOR:
        q = q.where(Indictment.prosecutor_id == current_user.id)
    elif current_user.role not in [ADMIN] + list(COMMITTEE_ROLES):
        raise HTTPException(status_code=403, detail="غير مصرح")

    if complaint_id:
        q = q.where(Indictment.complaint_id == complaint_id)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    q = q.offset((page - 1) * size).limit(size).order_by(Indictment.created_at.desc())
    items = (await db.execute(q)).scalars().all()

    return {"items": [_ind_dict(i) for i in items], "total": total, "page": page, "size": size, "pages": math.ceil(total / size) if total else 0}


@router.get("/{indictment_id}", response_model=dict)
async def get_indictment(
    indictment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ind = await db.get(Indictment, indictment_id)
    if not ind:
        raise HTTPException(status_code=404, detail="لائحة الادعاء غير موجودة")
    if current_user.role not in [ADMIN, PROSECUTOR] + list(COMMITTEE_ROLES):
        raise HTTPException(status_code=403, detail="غير مصرح")
    return _ind_dict(ind)


@router.patch("/{indictment_id}", response_model=dict)
async def update_indictment(
    indictment_id: uuid.UUID,
    data: IndictmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [ADMIN, PROSECUTOR]:
        raise HTTPException(status_code=403, detail="غير مصرح")

    ind = await db.get(Indictment, indictment_id)
    if not ind:
        raise HTTPException(status_code=404, detail="لائحة الادعاء غير موجودة")
    if ind.status == "referred":
        raise HTTPException(status_code=400, detail="لا يمكن تعديل لائحة محالة")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(ind, field, value)
    await db.commit()
    await db.refresh(ind)
    return _ind_dict(ind)


@router.post("/{indictment_id}/finalize", response_model=dict)
async def finalize_indictment(
    indictment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """اعتماد لائحة الادعاء"""
    if current_user.role not in [ADMIN, PROSECUTOR]:
        raise HTTPException(status_code=403, detail="غير مصرح")

    ind = await db.get(Indictment, indictment_id)
    if not ind:
        raise HTTPException(status_code=404, detail="لائحة الادعاء غير موجودة")
    if ind.status != "draft":
        raise HTTPException(status_code=400, detail="اللائحة ليست في حالة مسوّدة")

    ind.status = "finalized"
    ind.finalized_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(ind)
    return _ind_dict(ind)


@router.post("/{indictment_id}/refer", response_model=dict)
async def refer_to_committee(
    indictment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """إحالة لائحة الادعاء إلى لجنة التأديب"""
    if current_user.role not in [ADMIN, PROSECUTOR]:
        raise HTTPException(status_code=403, detail="غير مصرح")

    ind = await db.get(Indictment, indictment_id)
    if not ind:
        raise HTTPException(status_code=404, detail="لائحة الادعاء غير موجودة")
    if ind.status != "finalized":
        raise HTTPException(status_code=400, detail="اللائحة يجب أن تكون معتمدة أولاً")

    ind.status = "referred"
    ind.referred_at = datetime.now(timezone.utc)

    complaint = await db.get(Complaint, ind.complaint_id)
    if complaint and complaint.status == "indictment_prep":
        complaint.status = "referred_to_committee"
        complaint.referred_to_committee_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(ind)
    return _ind_dict(ind)
