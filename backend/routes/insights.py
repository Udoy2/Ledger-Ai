# backend/routes/insights.py
import json
from collections import Counter
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.embedder import get_all_records, record_count
from services.openrouter import (
    call_openrouter,
    PROMPT_CROSS_SOURCE_PATTERNS,
    PROMPT_TREND_ANALYSIS,
    PROMPT_OPPORTUNITY_SCORING,
)

router = APIRouter(prefix="/insights", tags=["insights"])


def _safe_json(raw: str) -> list:
    raw = raw.strip().strip("```json").strip("```").strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return []


def _records_to_text(records: list[dict], max_chars: int = 4000) -> str:
    lines = []
    for r in records:
        meta = r.get("metadata", {})
        lines.append(
            f"[{meta.get('source','?')}] {r['content'][:200]}"
        )
    combined = "\n".join(lines)
    return combined[:max_chars]


def _split_by_week(records: list[dict]):
    now = datetime.utcnow()
    this_week_start = now - timedelta(days=7)
    last_week_start = now - timedelta(days=14)

    this_week, last_week = [], []
    for r in records:
        try:
            d = datetime.strptime(r["metadata"].get("date", ""), "%Y-%m-%d")
        except ValueError:
            continue
        if d >= this_week_start:
            this_week.append(r)
        elif d >= last_week_start:
            last_week.append(r)
    return this_week, last_week


@router.get("/patterns")
async def cross_source_patterns():
    if record_count() == 0:
        raise HTTPException(status_code=503, detail="Run POST /ingest first.")

    records = get_all_records()
    text = _records_to_text(records)
    prompt = PROMPT_CROSS_SOURCE_PATTERNS.format(records=text)
    raw = call_openrouter(prompt, max_tokens=1024)
    patterns = _safe_json(raw)
    return {"patterns": patterns, "analyzed_records": len(records)}


@router.get("/trends")
async def trend_analysis():
    if record_count() == 0:
        raise HTTPException(status_code=503, detail="Run POST /ingest first.")

    records = get_all_records()
    this_week, last_week = _split_by_week(records)

    # Fallback: if not enough date-recent data, use first/second halves
    if len(this_week) < 3 or len(last_week) < 3:
        mid = len(records) // 2
        last_week = records[:mid]
        this_week = records[mid:]

    prompt = PROMPT_TREND_ANALYSIS.format(
        this_week=_records_to_text(this_week, 2000),
        last_week=_records_to_text(last_week, 2000),
    )
    raw = call_openrouter(prompt, max_tokens=1024)
    trends = _safe_json(raw)
    return {"trends": trends, "this_week_count": len(this_week), "last_week_count": len(last_week)}


@router.get("/opportunities")
async def opportunity_scoring():
    if record_count() == 0:
        raise HTTPException(status_code=503, detail="Run POST /ingest first.")

    records = get_all_records()

    # Group by topic + sentiment to build issue summary
    topic_groups: dict[str, dict] = {}
    for r in records:
        meta = r.get("metadata", {})
        topic = meta.get("topic", "general")
        sentiment = meta.get("sentiment", "neutral")
        urgency = meta.get("urgency", "normal")

        if topic not in topic_groups:
            topic_groups[topic] = {
                "topic": topic,
                "count": 0,
                "sentiments": [],
                "urgent": 0,
                "samples": [],
            }
        topic_groups[topic]["count"] += 1
        topic_groups[topic]["sentiments"].append(sentiment)
        if urgency == "high":
            topic_groups[topic]["urgent"] += 1
        if len(topic_groups[topic]["samples"]) < 2:
            topic_groups[topic]["samples"].append(r["content"][:100])

    issues_summary = json.dumps(list(topic_groups.values()), indent=2)[:3000]
    prompt = PROMPT_OPPORTUNITY_SCORING.format(issues=issues_summary)
    raw = call_openrouter(prompt, max_tokens=1024)
    opportunities = _safe_json(raw)
    return {"opportunities": opportunities}
