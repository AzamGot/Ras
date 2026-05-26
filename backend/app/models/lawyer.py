import uuid
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, Boolean, Date, DateTime, Numeric, Integer, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Lawyer(Base):
    __tablename__ = "lawyers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    license_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    bar_registration_date: Mapped[date] = mapped_column(Date, nullable=False)
    license_type: Mapped[str] = mapped_column(String(50), nullable=False)  # مزاول، غير مزاول
    specialization: Mapped[str | None] = mapped_column(String(255), nullable=True)
    office_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    office_address: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    office_city: Mapped[str | None] = mapped_column(String(100), nullable=True)

    is_suspended: Mapped[bool] = mapped_column(Boolean, default=False)
    suspension_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    suspension_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_struck_off: Mapped[bool] = mapped_column(Boolean, default=False)
    struck_off_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # AI risk score 0-100
    risk_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.0"))
    risk_score_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ai_risk_factors: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    complaint_count: Mapped[int] = mapped_column(Integer, default=0)
    violation_count: Mapped[int] = mapped_column(Integer, default=0)
    recidivism_flag: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="lawyer_profile", foreign_keys=[user_id])
    complaints = relationship("Complaint", back_populates="respondent_lawyer", foreign_keys="Complaint.respondent_lawyer_id")
