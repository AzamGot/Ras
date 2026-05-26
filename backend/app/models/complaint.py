import uuid
from datetime import datetime, date
from sqlalchemy import String, Boolean, Date, DateTime, Text, BigInteger, ForeignKey, func, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reference_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)

    complainant_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    respondent_lawyer_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("lawyers.id"), nullable=True)

    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    incident_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    filing_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Workflow state machine
    # draft → submitted → registered → under_investigation →
    # indictment_prep → referred_to_committee → sessions_ongoing →
    # decision_issued → pending_minister → in_effect → appealed → executed → closed
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="draft")

    # Violation classification
    violation_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    violation_subtype: Mapped[str | None] = mapped_column(String(100), nullable=True)
    applicable_articles: Mapped[list] = mapped_column(JSONB, default=list)
    severity: Mapped[str | None] = mapped_column(String(20), nullable=True)  # low, medium, high, critical
    ai_classification: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Assignment
    assigned_investigator_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    assigned_prosecutor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Registration & sorting
    formal_check_passed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    formal_check_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    formal_check_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    formal_check_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    closure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Stage timestamps
    registered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    investigation_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    investigation_closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    referred_to_committee_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    decision_issued_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    is_confidential: Mapped[bool] = mapped_column(Boolean, default=False)
    minister_approval_required: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    complainant = relationship("User", foreign_keys=[complainant_id])
    respondent_lawyer = relationship("Lawyer", back_populates="complaints", foreign_keys=[respondent_lawyer_id])
    investigator = relationship("User", foreign_keys=[assigned_investigator_id])
    prosecutor = relationship("User", foreign_keys=[assigned_prosecutor_id])
    formal_checker = relationship("User", foreign_keys=[formal_check_by])

    evidence = relationship("Evidence", back_populates="complaint", cascade="all, delete-orphan")
    investigation_records = relationship("InvestigationRecord", back_populates="complaint")
    indictments = relationship("Indictment", back_populates="complaint")
    sessions = relationship("DisciplinarySession", back_populates="complaint")
    decisions = relationship("Decision", back_populates="complaint")

    __table_args__ = (
        Index("idx_complaints_status", "status"),
        Index("idx_complaints_lawyer", "respondent_lawyer_id"),
        Index("idx_complaints_complainant", "complainant_id"),
        Index("idx_complaints_reference", "reference_number"),
    )


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    complaint_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("complaints.id", ondelete="CASCADE"))
    uploaded_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_name_ar: Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    file_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_hash: Mapped[str] = mapped_column(String(64), nullable=False)

    evidence_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_confidential: Mapped[bool] = mapped_column(Boolean, default=False)

    custody_log: Mapped[list] = mapped_column(JSONB, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    complaint = relationship("Complaint", back_populates="evidence")
    uploader = relationship("User", foreign_keys=[uploaded_by])
