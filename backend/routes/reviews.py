# backend/routes/reviews.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.embedder import get_all_records
from services.openrouter import call_openrouter, PROMPT_REVIEW_RESPOND

router = APIRouter(prefix="/reviews", tags=["reviews"])


class ReviewOut(BaseModel):
    id: str
    source: str
    content: str
    sentiment: str | None
    topic: str | None
    urgency: str
    date: str
    star_rating: int | None
    author: str | None


class RespondRequest(BaseModel):
    review_id: str
    star_rating: int
    review_text: str


class RespondResponse(BaseModel):
    review_id: str
    reply: str


def _reputation_score(reviews: list[dict]) -> float:
    """Weighted average of star ratings across google_reviews and facebook."""
    stars = []
    for r in reviews:
        meta = r.get("metadata", {})
        rating = meta.get("star_rating")
        if rating:
            stars.append(int(rating))
    if not stars:
        return 0.0
    return round(sum(stars) / len(stars), 2)


@router.get("", response_model=dict)
async def get_reviews():
    """Return all review records from google_reviews and facebook sources."""
    all_records = get_all_records()
    review_sources = {"google_reviews", "facebook"}

    reviews_out = []
    for r in all_records:
        meta = r.get("metadata", {})
        if meta.get("source") not in review_sources:
            continue
        reviews_out.append({
            "id": r["id"],
            "source": meta.get("source"),
            "content": r["content"],
            "sentiment": meta.get("sentiment"),
            "topic": meta.get("topic"),
            "urgency": meta.get("urgency", "normal"),
            "date": meta.get("date", ""),
            "star_rating": meta.get("star_rating"),
            "author": meta.get("author"),
        })

    reputation = _reputation_score(all_records)
    return {
        "reviews": reviews_out,
        "reputation_score": reputation,
        "total": len(reviews_out),
    }


@router.post("/respond", response_model=RespondResponse)
async def respond_to_review(request: RespondRequest):
    """Generate an AI reply for a given review."""
    if not request.review_text.strip():
        raise HTTPException(status_code=400, detail="review_text must not be empty.")

    prompt = PROMPT_REVIEW_RESPOND.format(
        rating=request.star_rating,
        review_text=request.review_text,
    )
    reply = call_openrouter(prompt, max_tokens=150)
    return RespondResponse(review_id=request.review_id, reply=reply.strip())
