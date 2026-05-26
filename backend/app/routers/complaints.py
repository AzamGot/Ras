import uuid
import math
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.database import get_db
from app.models.complaint import Complaint
from app.models.user import User
from app.schemas.complaint import (
    ComplaintCreate, ComplaintUpdate, ComplaintResponse,
    ComplaintListResponse, ComplaintFormalCheck, ComplaintAssignInvestigator
)
from app.dependencies import get_current_user
from app.core.permissions import ADMIN, COMPLAINANT, INVESTIGATOR, PROSECUTOR, COMMITTEE_ROLES, STAFF_ROLES
from app.services.complaint_service import apply_transition, can_transition

router = APIRouter(prefix="/complaints", tags=["الشكاوى"])


def _generate_reference_number() -> str:
    from datetime import datetime
    import random
    year = datetime.now().year
    seq = random.randint(100000, 999999)
    return f"SCM-{year}-{seq}"


@router.post("", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
async def submit_complaint(
    data: ComplaintCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [COMPLAINANT, ADMIN]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="غير مصرح")

    complaint = Complaint(
        reference_number=_generate_reference_number(),
        complainant_id=current_user.id,
        respondent_lawyer_id=data.respondent_lawyer_id,
        title=data.title,
        description=data.description,
        incident_date=data.incident_date,
        is_confidential=data.is_confidential,
        status="submitted",
    )
    db.add(complaint)
    await db.commit()
    await db.refresh(complaint)
    return complaint


@router.get("", response_model=ComplaintListResponse)
async def list_complaints(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(Complaint)

    if current_user.role == COMPLAINANT:
        q = q.where(Complaint.complainant_id == current_user.id)
    elif current_user.role == INVESTIGATOR:
        q = q.where(Complaint.assigned_investigator_id == current_user.id)
    elif current_user.role == PROSECUTOR:
        q = q.where(Complaint.assigned_prosecutor_id == current_user.id)
    elif current_user.role == "lawyer":
        pass  # Handled separately via lawyer profile
    # ADMIN and COMMITTEE roles see all

    if status_filter:
        q = q.where(Complaint.status == status_filter)

    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar()

    q = q.offset((page - 1) * size).limit(size).order_by(Complaint.created_at.desc())
    result = await db.execute(q)
    items = result.scalars().all()

    return ComplaintListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total > 0 else 0,
    )


@router.get("/{complaint_id}", response_model=ComplaintResponse)
async def get_complaint(
    complaint_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Complaint).where(Complaint.id == complaint_id))
    complaint = result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="الشكوى غير موجودة")

    from app.core.permissions import can_view_complaint
    if not can_view_complaint(current_user, complaint):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="غير مصرح بالوصول")

    return complaint


@router.patch("/{complaint_id}", response_model=ComplaintResponse)
async def update_complaint(
    complaint_id: uuid.UUID,
    data: ComplaintUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Complaint).where(Complaint.id == complaint_id))
    complaint = result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="الشكوى غير موجودة")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(complaint, field, value)

    await db.commit()
    await db.refresh(complaint)
    return complaint


@router.post("/{complaint_id}/register", response_model=ComplaintResponse)
async def register_complaint(
    complaint_id: uuid.UUID,
    check: ComplaintFormalCheck,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """قيد وفرز الشكوى"""
    if current_user.role != ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="غير مصرح")

    result = await db.execute(select(Complaint).where(Complaint.id == complaint_id))
    complaint = result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="الشكوى غير موجودة")

    if complaint.status != "submitted":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="لا يمكن قيد الشكوى في هذه المرحلة")

    complaint.formal_check_passed = check.passed
    complaint.formal_check_notes = check.notes
    complaint.formal_check_date = datetime.now(timezone.utc)
    complaint.formal_check_by = current_user.id

    if check.passed:
        complaint.status = "registered"
        complaint.registered_at = datetime.now(timezone.utc)
    else:
        complaint.status = "rejected"

    await db.commit()
    await db.refresh(complaint)
    return complaint


@router.post("/{complaint_id}/assign-investigator", response_model=ComplaintResponse)
async def assign_investigator(
    complaint_id: uuid.UUID,
    data: ComplaintAssignInvestigator,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="غير مصرح")

    result = await db.execute(select(Complaint).where(Complaint.id == complaint_id))
    complaint = result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="الشكوى غير موجودة")

    if complaint.status != "registered":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="الشكوى يجب أن تكون مقيدة أولاً")

    # Verify investigator role
    inv_result = await db.execute(
        select(User).where(User.id == data.investigator_id, User.role == INVESTIGATOR)
    )
    investigator = inv_result.scalar_one_or_none()
    if not investigator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="المحقق غير موجود")

    complaint.assigned_investigator_id = data.investigator_id
    complaint.status = "under_investigation"
    complaint.investigation_started_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(complaint)
    return complaint
