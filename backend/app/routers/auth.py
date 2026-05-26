from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, RefreshRequest
from app.schemas.user import UserMe
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.dependencies import get_current_user
from app.core.permissions import ADMIN

router = APIRouter(prefix="/auth", tags=["المصادقة"])


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email, User.is_active == True))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="البريد الإلكتروني أو كلمة المرور غير صحيحة"
        )

    user.last_login = datetime.now(timezone.utc)
    await db.commit()

    token_data = {"sub": str(user.id), "role": user.role, "national_id": user.national_id}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check if email or national_id already used
    result = await db.execute(
        select(User).where((User.email == data.email) | (User.national_id == data.national_id))
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="البريد الإلكتروني أو رقم الهوية مسجل مسبقاً"
        )

    user = User(
        national_id=data.national_id,
        full_name_ar=data.full_name_ar,
        email=data.email,
        phone=data.phone,
        password_hash=hash_password(data.password),
        role=data.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token_data = {"sub": str(user.id), "role": user.role, "national_id": user.national_id}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="رمز التحديث غير صالح")

    result = await db.execute(select(User).where(User.id == payload["sub"], User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="المستخدم غير موجود")

    token_data = {"sub": str(user.id), "role": user.role, "national_id": user.national_id}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.get("/me", response_model=UserMe)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/users", response_model=list)
async def list_users(
    role: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """قائمة المستخدمين — للمشرف فقط"""
    if current_user.role != ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="غير مصرح")
    q = select(User).where(User.is_active == True)
    if role:
        q = q.where(User.role == role)
    result = await db.execute(q)
    users = result.scalars().all()
    return [{"id": str(u.id), "full_name_ar": u.full_name_ar, "role": u.role, "email": u.email} for u in users]
