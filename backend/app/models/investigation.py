import uuid
from datetime import datetime, date
from sqlalchemy import String, Boolean, Date, DateTime, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class InvestigationRecord(Base):
    """سجل التحقيق"""
    __tablename__ = "investigation_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    complaint_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("complaints.id", ondelete="CASCADE"))
    investigator_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    investigation_plan: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    target_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    actual_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    findings: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_violation_found: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    # refer_to_prosecutor, dismiss, archive
    recommended_action: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # in_progress, completed, suspended
    status: Mapped[str] = mapped_column(String(50), default="in_progress")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    complaint = relationship("Complaint", back_populates="investigation_records")
    investigator = relationship("User", foreign_keys=[investigator_id])
    interviews = relationship("InvestigationInterview", back_populates="investigation", cascade="all, delete-orphan")
    requests = relationship("InvestigationRequest", back_populates="investigation", cascade="all, delete-orphan")
    indictments = relationship("Indictment", back_populates="investigation")


class InvestigationInterview(Base):
    """محاضر الاستجواب"""
    __tablename__ = "investigation_interviews"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    investigation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("investigation_records.id"))
    interviewee_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    interviewee_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # complainant, respondent, witness
    interviewee_role: Mapped[str | None] = mapped_column(String(100), nullable=True)
    interview_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    attachments: Mapped[list] = mapped_column(JSONB, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    investigation = relationship("InvestigationRecord", back_populates="interviews")
    interviewee = relationship("User", foreign_keys=[interviewee_id])


class InvestigationRequest(Base):
    """طلبات معلومات إضافية"""
    __tablename__ = "investigation_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    investigation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("investigation_records.id"))
    requested_from_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # document, statement, clarification
    request_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    request_text: Mapped[str] = mapped_column(Text, nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    response_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    response_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    investigation = relationship("InvestigationRecord", back_populates="requests")
    requested_from = relationship("User", foreign_keys=[requested_from_id])
