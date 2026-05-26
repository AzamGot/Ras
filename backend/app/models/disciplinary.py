import uuid
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, Boolean, Date, DateTime, Text, Numeric, Integer, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DisciplinarySession(Base):
    """جلسة التأديب"""
    __tablename__ = "disciplinary_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    complaint_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("complaints.id"))
    indictment_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("indictments.id"), nullable=True)

    session_number: Mapped[int] = mapped_column(Integer, nullable=False)
    scheduled_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    actual_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_virtual: Mapped[bool] = mapped_column(Boolean, default=False)
    virtual_link: Mapped[str | None] = mapped_column(String(500), nullable=True)

    chair_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    members_present: Mapped[list] = mapped_column(JSONB, default=list)

    complainant_present: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    respondent_present: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    respondent_excused: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    agenda: Mapped[str | None] = mapped_column(Text, nullable=True)
    minutes: Mapped[str | None] = mapped_column(Text, nullable=True)
    postponement_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # continue, finalize_decision, postpone
    session_outcome: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # scheduled, in_progress, completed, cancelled
    status: Mapped[str] = mapped_column(String(50), default="scheduled")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    complaint = relationship("Complaint", back_populates="sessions")
    indictment = relationship("Indictment", back_populates="sessions")
    chair = relationship("User", foreign_keys=[chair_id])
    decisions = relationship("Decision", back_populates="session")


class Decision(Base):
    """القرار التأديبي"""
    __tablename__ = "decisions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    complaint_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("complaints.id"))
    session_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("disciplinary_sessions.id"), nullable=True)
    indictment_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("indictments.id"), nullable=True)

    decision_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    decision_date: Mapped[date] = mapped_column(Date, nullable=False)

    is_guilty: Mapped[bool] = mapped_column(Boolean, nullable=False)
    verdict_text: Mapped[str] = mapped_column(Text, nullable=False)
    reasoning: Mapped[str] = mapped_column(Text, nullable=False)

    # تنبيه، لوم، غرامة_مالية، وقف_مؤقت، شطب_من_الجدول
    sanction_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sanction_details: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    aggravating_factors: Mapped[list] = mapped_column(JSONB, default=list)
    mitigating_factors: Mapped[list] = mapped_column(JSONB, default=list)

    ai_recommendation_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("ai_analysis_records.id"), nullable=True)

    chair_signed: Mapped[bool] = mapped_column(Boolean, default=False)
    chair_signed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    members_signatures: Mapped[list] = mapped_column(JSONB, default=list)

    # pending, approved, rejected, modified
    requires_minister_approval: Mapped[bool] = mapped_column(Boolean, default=False)
    minister_approval_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    minister_approval_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    minister_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    notified_lawyer: Mapped[bool] = mapped_column(Boolean, default=False)
    notified_complainant: Mapped[bool] = mapped_column(Boolean, default=False)
    notification_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    appeal_deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_final: Mapped[bool] = mapped_column(Boolean, default=False)

    # draft, signed, pending_minister, approved, in_effect, appealed, stayed
    status: Mapped[str] = mapped_column(String(50), default="draft")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    complaint = relationship("Complaint", back_populates="decisions")
    session = relationship("DisciplinarySession", back_populates="decisions")
    indictment = relationship("Indictment", back_populates="decisions")
    ai_recommendation = relationship("AIAnalysisRecord", foreign_keys=[ai_recommendation_id])
    execution = relationship("SanctionExecution", back_populates="decision", uselist=False)
    appeals = relationship("Appeal", back_populates="decision")


class SanctionExecution(Base):
    """تنفيذ العقوبة"""
    __tablename__ = "sanctions_execution"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    decision_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("decisions.id"))
    executor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    execution_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    execution_method: Mapped[str | None] = mapped_column(String(255), nullable=True)
    execution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    fine_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    fine_paid: Mapped[bool] = mapped_column(Boolean, default=False)
    fine_paid_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    fine_receipt: Mapped[str | None] = mapped_column(String(255), nullable=True)

    suspension_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    suspension_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    suspension_notified: Mapped[bool] = mapped_column(Boolean, default=False)

    struck_off_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    bar_notified: Mapped[bool] = mapped_column(Boolean, default=False)

    status: Mapped[str] = mapped_column(String(50), default="pending")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    decision = relationship("Decision", back_populates="execution")
    executor = relationship("User", foreign_keys=[executor_id])


class Appeal(Base):
    """الطعن"""
    __tablename__ = "appeals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    decision_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("decisions.id"))
    appellant_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    appeal_date: Mapped[date] = mapped_column(Date, nullable=False)
    grounds: Mapped[str] = mapped_column(Text, nullable=False)
    supporting_docs: Mapped[list] = mapped_column(JSONB, default=list)

    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    review_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    # upheld, overturned, modified, dismissed
    outcome: Mapped[str | None] = mapped_column(String(100), nullable=True)
    outcome_reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)

    stay_requested: Mapped[bool] = mapped_column(Boolean, default=False)
    stay_granted: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    # filed, under_review, decided, closed
    status: Mapped[str] = mapped_column(String(50), default="filed")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    decision = relationship("Decision", back_populates="appeals")
    appellant = relationship("User", foreign_keys=[appellant_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
