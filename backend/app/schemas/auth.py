from pydantic import BaseModel, EmailStr, field_validator
import re


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    national_id: str
    full_name_ar: str
    email: EmailStr
    phone: str
    password: str

    @field_validator("national_id")
    @classmethod
    def validate_national_id(cls, v: str) -> str:
        if not re.match(r"^\d{10}$", v):
            raise ValueError("رقم الهوية الوطنية يجب أن يتكون من 10 أرقام")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("كلمة المرور يجب أن تكون 8 أحرف على الأقل")
        return v


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str
