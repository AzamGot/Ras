import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr
from typing import Optional


class UserBase(BaseModel):
    national_id: str
    full_name_ar: str
    full_name_en: Optional[str] = None
    email: EmailStr
    phone: str
    role: str


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name_ar: Optional[str] = None
    full_name_en: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: uuid.UUID
    is_active: bool
    is_verified: bool
    last_login: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserMe(UserResponse):
    pass
