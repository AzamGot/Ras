import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Indictment(Base):
    """لائحة الادعاء"""
    __tablename__ = "indictments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    complaint_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("complaints.id", ondelete="CASCADE"))
    prosecutor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    investigation_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("investigation_records.id"), nullable=True)

    document_number: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True)
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # [{charge_number, description, applicable_article, evidence_ids, severity}]
    charges: Mapped[list] = mapped_column(JSONB, default=list)
    full_text: Mapped[str] = mapped_column(Text, nullable=False)

    # [{factor, description, weight}]
    aggravating_factors: Mapped[list] = mapped_column(JSONB, default=list)
    mitigating_factors: Mapped[list] = mapped_column(JSONB, default=list)

    ai_sanction_suggestion: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    prosecutor_sanction_rec: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # draft, finalized, referred
    status: Mapped[str] = mapped_column(String(50), default="draft")
    finalized_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    referred_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    complaint = relationship("Complaint", back_populates="indictments")
    prosecutor = relationship("User", foreign_keys=[prosecutor_id])
    investigation = relationship("InvestigationRecord", back_populates="indictments")
    sessions = relationship("DisciplinarySession", back_populates="indictment")
    decisions = relationship("Decision", back_populates="indictment")
