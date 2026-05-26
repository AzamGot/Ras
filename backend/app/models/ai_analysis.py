import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Text, Integer, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from decimal import Decimal
from sqlalchemy import Numeric

from app.database import Base


class AIAnalysisRecord(Base):
    """سجل تحليلات الذكاء الاصطناعي"""
    __tablename__ = "ai_analysis_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # entity_type: complaint, lawyer, decision, investigation, indictment
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)

    # analysis_type:
    # complaint_classification, risk_scoring, sanction_recommendation,
    # circumstance_analysis, pattern_monitoring, chatbot_session,
    # investigation_questions, indictment_draft, decision_draft, document_compliance
    analysis_type: Mapped[str] = mapped_column(String(100), nullable=False)

    input_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(20), nullable=False)
    model_used: Mapped[str] = mapped_column(String(100), nullable=False)

    output_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    confidence_score: Mapped[Decimal | None] = mapped_column(Numeric(4, 3), nullable=True)

    tokens_used: Mapped[int | None] = mapped_column(Integer, nullable=True)
    processing_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    # accepted, modified, rejected
    review_action: Mapped[str | None] = mapped_column(String(50), nullable=True)
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    reviewer = relationship("User", foreign_keys=[reviewed_by])
