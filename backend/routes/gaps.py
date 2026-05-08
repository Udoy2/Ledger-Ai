# backend/routes/gaps.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.db import get_unanswered_questions, approve_faq, get_approved_faqs
from services.openrouter import call_openrouter, PROMPT_GENERATE_FAQ_ANSWER

router = APIRouter(prefix="/gaps", tags=["gaps"])


class GapOut(BaseModel):
    id: str
    source: str
    question: str
    date: str
    reviewed: int


class ApproveRequest(BaseModel):
    question_id: str
    custom_answer: str | None = None  # If None, AI generates the answer


class ApproveResponse(BaseModel):
    question_id: str
    answer: str
    status: str


class FAQOut(BaseModel):
    id: int
    question: str
    answer: str
    source_id: str | None
    approved_at: str


@router.get("", response_model=dict)
async def get_gaps():
    """Return all unreviewed unanswered questions from support chats."""
    questions = get_unanswered_questions()
    gaps = [GapOut(**q) for q in questions]
    return {"gaps": [g.model_dump() for g in gaps], "total": len(gaps)}


@router.post("/approve", response_model=ApproveResponse)
async def approve_gap(request: ApproveRequest):
    """
    Approve an unanswered question as an FAQ.
    If custom_answer is not provided, AI generates one automatically.
    """
    questions = get_unanswered_questions()
    question_text = next(
        (q["question"] for q in questions if q["id"] == request.question_id), None
    )
    if not question_text:
        raise HTTPException(status_code=404, detail="Question not found or already reviewed.")

    # Use custom answer or generate via AI
    if request.custom_answer and request.custom_answer.strip():
        answer = request.custom_answer.strip()
    else:
        prompt = PROMPT_GENERATE_FAQ_ANSWER.format(question=question_text)
        answer = call_openrouter(prompt, max_tokens=200).strip()

    approve_faq(question_id=request.question_id, answer=answer)

    return ApproveResponse(
        question_id=request.question_id,
        answer=answer,
        status="approved",
    )


@router.get("/faqs", response_model=dict)
async def get_faqs():
    """Return all approved FAQs."""
    faqs = get_approved_faqs()
    return {"faqs": faqs, "total": len(faqs)}
