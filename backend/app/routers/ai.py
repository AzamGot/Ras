import uuid
import json
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models.complaint import Complaint
from app.models.lawyer import Lawyer
from app.models.user import User
from app.models.ai_analysis import AIAnalysisRecord
from app.dependencies import get_current_user
from app.ai.analyzers.complaint_classifier import classify_complaint
from app.ai.analyzers.risk_scorer import compute_lawyer_risk_score
from app.ai.analyzers.sanction_recommender import recommend_sanction
from app.ai.analyzers.investigation_assistant import (
    generate_investigation_questions,
    draft_indictment,
    draft_disciplinary_decision,
    review_document_compliance,
)
from app.ai.analyzers.legal_chatbot import chat_with_complainant
from app.core.permissions import ADMIN, INVESTIGATOR, PROSECUTOR, COMMITTEE_CHAIR, COMMITTEE_MEMBER, COMPLAINANT

router = APIRouter(prefix="/ai", tags=["الذكاء الاصطناعي"])


# ── Complaint Classification ──────────────────────────────────────────────

class ClassifyRequest(BaseModel):
    complaint_id: uuid.UUID


@router.post("/classify-complaint")
async def classify_complaint_endpoint(
    data: ClassifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [ADMIN, INVESTIGATOR]:
        raise HTTPException(status_code=403, detail="غير مصرح")

    result = await db.execute(select(Complaint).where(Complaint.id == data.complaint_id))
    complaint = result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=404, detail="الشكوى غير موجودة")

    classification = await classify_complaint(complaint.description, complaint.title)

    # Store result
    analysis = AIAnalysisRecord(
        entity_type="complaint",
        entity_id=complaint.id,
        analysis_type="complaint_classification",
        input_data={"description": complaint.description[:500], "title": complaint.title},
        prompt_version=classification.get("prompt_version", "v1.0"),
        model_used=classification.get("model", "claude-sonnet-4-6"),
        output_data=classification,
        tokens_used=classification.get("tokens_used"),
        confidence_score=classification.get("confidence"),
    )
    db.add(analysis)

    # Update complaint
    complaint.ai_classification = classification
    complaint.violation_type = classification.get("violation_type")
    complaint.severity = classification.get("severity")
    complaint.applicable_articles = classification.get("applicable_articles", [])

    await db.commit()
    return classification


# ── Legal Chatbot (Streaming) ─────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]


@router.post("/chat")
async def chat_endpoint(
    data: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    """المساعد القانوني للمشتكين - streaming"""
    messages = [{"role": m.role, "content": m.content} for m in data.messages]

    async def event_stream():
        async for chunk in chat_with_complainant(messages):
            yield f"data: {json.dumps({'text': chunk}, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ── Lawyer Risk Score ─────────────────────────────────────────────────────

@router.get("/lawyers/{lawyer_id}/risk-score")
async def get_lawyer_risk_score(
    lawyer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [ADMIN, INVESTIGATOR, PROSECUTOR, COMMITTEE_CHAIR, COMMITTEE_MEMBER]:
        raise HTTPException(status_code=403, detail="غير مصرح")

    result = await db.execute(select(Lawyer).where(Lawyer.id == lawyer_id))
    lawyer = result.scalar_one_or_none()
    if not lawyer:
        raise HTTPException(status_code=404, detail="المحامي غير موجود")

    # Build history from complaints
    comp_result = await db.execute(select(Complaint).where(Complaint.respondent_lawyer_id == lawyer_id))
    complaints = comp_result.scalars().all()

    complaint_history = [
        {
            "date": str(c.filing_date.date()) if c.filing_date else None,
            "violation_type": c.violation_type,
            "severity": c.severity,
            "outcome": c.status,
        }
        for c in complaints
    ]

    lawyer_profile = {
        "license_number": lawyer.license_number,
        "years_licensed": None,
        "status": "suspended" if lawyer.is_suspended else "struck_off" if lawyer.is_struck_off else "active",
    }

    risk_data = await compute_lawyer_risk_score(lawyer_profile, complaint_history, [])

    # Update risk score
    lawyer.risk_score = risk_data.get("risk_score", 0)

    # Store analysis
    analysis = AIAnalysisRecord(
        entity_type="lawyer",
        entity_id=lawyer_id,
        analysis_type="risk_scoring",
        input_data={"lawyer_id": str(lawyer_id), "complaint_count": len(complaints)},
        prompt_version=risk_data.get("prompt_version", "v1.0"),
        model_used="claude-sonnet-4-6",
        output_data=risk_data,
        confidence_score=risk_data.get("confidence"),
    )
    db.add(analysis)
    await db.commit()

    return risk_data


# ── Sanction Recommendation ───────────────────────────────────────────────

class SanctionRequest(BaseModel):
    complaint_id: uuid.UUID
    aggravating_factors: list[str] = []
    mitigating_factors: list[str] = []


@router.post("/recommend-sanction")
async def recommend_sanction_endpoint(
    data: SanctionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [ADMIN, PROSECUTOR, COMMITTEE_CHAIR, COMMITTEE_MEMBER]:
        raise HTTPException(status_code=403, detail="غير مصرح")

    result = await db.execute(select(Complaint).where(Complaint.id == data.complaint_id))
    complaint = result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=404, detail="الشكوى غير موجودة")

    lawyer_history = {}
    if complaint.respondent_lawyer_id:
        lresult = await db.execute(select(Lawyer).where(Lawyer.id == complaint.respondent_lawyer_id))
        lawyer = lresult.scalar_one_or_none()
        if lawyer:
            lawyer_history = {
                "complaint_count": lawyer.complaint_count,
                "violation_count": lawyer.violation_count,
                "recidivism_flag": lawyer.recidivism_flag,
            }

    recommendation = await recommend_sanction(
        violation_type=complaint.violation_type or "conduct_violation",
        severity=complaint.severity or "medium",
        lawyer_history=lawyer_history,
        aggravating_factors=data.aggravating_factors,
        mitigating_factors=data.mitigating_factors,
        complaint_description=complaint.description,
    )

    analysis = AIAnalysisRecord(
        entity_type="complaint",
        entity_id=complaint.id,
        analysis_type="sanction_recommendation",
        input_data={"complaint_id": str(complaint.id), "aggravating": data.aggravating_factors},
        prompt_version=recommendation.get("prompt_version", "v1.0"),
        model_used="claude-sonnet-4-6",
        output_data=recommendation,
        confidence_score=recommendation.get("confidence"),
    )
    db.add(analysis)
    await db.commit()

    return recommendation


# ── Investigation Questions ───────────────────────────────────────────────

class InvestigationQuestionsRequest(BaseModel):
    complaint_id: uuid.UUID
    target_party: str  # complainant, respondent, witness
    evidence_summary: str = ""


@router.post("/draft/investigation-questions")
async def draft_investigation_questions(
    data: InvestigationQuestionsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [ADMIN, INVESTIGATOR]:
        raise HTTPException(status_code=403, detail="غير مصرح")

    result = await db.execute(select(Complaint).where(Complaint.id == data.complaint_id))
    complaint = result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=404, detail="الشكوى غير موجودة")

    questions = await generate_investigation_questions(
        complaint_description=complaint.description,
        violation_type=complaint.violation_type or "professional_duty_breach",
        evidence_summary=data.evidence_summary,
        target_party=data.target_party,
    )
    return questions


# ── Indictment Draft ──────────────────────────────────────────────────────

class IndictmentDraftRequest(BaseModel):
    complaint_id: uuid.UUID
    investigation_findings: str
    charges: list[dict]


@router.post("/draft/indictment")
async def draft_indictment_endpoint(
    data: IndictmentDraftRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [ADMIN, PROSECUTOR]:
        raise HTTPException(status_code=403, detail="غير مصرح")

    result = await db.execute(select(Complaint).where(Complaint.id == data.complaint_id))
    complaint = result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=404, detail="الشكوى غير موجودة")

    lawyer_profile = {}
    if complaint.respondent_lawyer_id:
        lresult = await db.execute(select(Lawyer).where(Lawyer.id == complaint.respondent_lawyer_id))
        lawyer = lresult.scalar_one_or_none()
        if lawyer:
            lawyer_profile = {"license_number": lawyer.license_number}

    draft = await draft_indictment(
        complaint_data={"reference_number": complaint.reference_number},
        investigation_findings=data.investigation_findings,
        charges=data.charges,
        lawyer_profile=lawyer_profile,
    )
    return draft


# ── Decision Draft ────────────────────────────────────────────────────────

class DecisionDraftRequest(BaseModel):
    complaint_id: uuid.UUID
    session_minutes: str
    charges: list[dict]
    aggravating_factors: list[dict] = []
    mitigating_factors: list[dict] = []
    recommended_sanction: str


@router.post("/draft/decision")
async def draft_decision_endpoint(
    data: DecisionDraftRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [ADMIN, COMMITTEE_CHAIR]:
        raise HTTPException(status_code=403, detail="غير مصرح")

    result = await db.execute(select(Complaint).where(Complaint.id == data.complaint_id))
    complaint = result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(status_code=404, detail="الشكوى غير موجودة")

    lawyer_profile = {}
    if complaint.respondent_lawyer_id:
        lresult = await db.execute(select(Lawyer).where(Lawyer.id == complaint.respondent_lawyer_id))
        lawyer = lresult.scalar_one_or_none()
        if lawyer:
            lawyer_profile = {"license_number": lawyer.license_number}

    draft = await draft_disciplinary_decision(
        complaint_data={"reference_number": complaint.reference_number},
        session_minutes=data.session_minutes,
        charges=data.charges,
        lawyer_profile=lawyer_profile,
        aggravating_factors=data.aggravating_factors,
        mitigating_factors=data.mitigating_factors,
        recommended_sanction=data.recommended_sanction,
    )
    return draft


# ── Document Compliance Review ────────────────────────────────────────────

class ComplianceReviewRequest(BaseModel):
    document_text: str
    document_type: str  # indictment, decision, investigation_report


@router.post("/review/document-compliance")
async def review_compliance_endpoint(
    data: ComplianceReviewRequest,
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [ADMIN, PROSECUTOR, COMMITTEE_CHAIR, COMMITTEE_MEMBER, INVESTIGATOR]:
        raise HTTPException(status_code=403, detail="غير مصرح")

    result = await review_document_compliance(
        document_text=data.document_text,
        document_type=data.document_type,
    )
    return result
