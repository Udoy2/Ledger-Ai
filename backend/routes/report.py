# backend/routes/report.py
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.embedder import get_all_records, record_count
from services.db import get_approved_faqs
from services.openrouter import call_openrouter, PROMPT_WEEKLY_REPORT

router = APIRouter(prefix="/report", tags=["report"])


class WeeklyReportResponse(BaseModel):
    report: str
    stats: dict


def _compute_stats(records: list[dict]) -> dict:
    total = len(records)
    sentiment_counts = {"positive": 0, "neutral": 0, "negative": 0}
    source_counts: dict[str, int] = {}
    urgent_count = 0

    for r in records:
        meta = r.get("metadata", {})
        sentiment = meta.get("sentiment", "neutral")
        if sentiment in sentiment_counts:
            sentiment_counts[sentiment] += 1
        source = meta.get("source", "unknown")
        source_counts[source] = source_counts.get(source, 0) + 1
        if meta.get("urgency") == "high":
            urgent_count += 1

    positive_pct = round(sentiment_counts["positive"] / total * 100, 1) if total else 0
    negative_pct = round(sentiment_counts["negative"] / total * 100, 1) if total else 0

    return {
        "total_records": total,
        "sentiment_breakdown": sentiment_counts,
        "positive_pct": positive_pct,
        "negative_pct": negative_pct,
        "source_breakdown": source_counts,
        "urgent_issues": urgent_count,
        "approved_faqs": len(get_approved_faqs()),
    }


@router.get("/weekly", response_model=WeeklyReportResponse)
async def weekly_report():
    """Generate a full AI-written weekly business intelligence report."""
    if record_count() == 0:
        raise HTTPException(status_code=503, detail="Run POST /ingest first.")

    records = get_all_records()
    stats = _compute_stats(records)

    # Build a compact data summary for the prompt
    sample_records = records[:30]  # limit prompt size
    data_summary = {
        "stats": stats,
        "sample_feedback": [
            {
                "source": r["metadata"].get("source"),
                "sentiment": r["metadata"].get("sentiment"),
                "topic": r["metadata"].get("topic"),
                "content": r["content"][:150],
            }
            for r in sample_records
        ],
    }

    prompt = PROMPT_WEEKLY_REPORT.format(data=json.dumps(data_summary, indent=2))
    report_text = call_openrouter(prompt, max_tokens=900)

    return WeeklyReportResponse(report=report_text, stats=stats)
