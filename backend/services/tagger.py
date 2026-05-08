# backend/services/tagger.py
import json
from services.openrouter import call_openrouter, PROMPT_TAG_SENTIMENT_TOPIC


def tag_record(record: dict) -> dict:
    """
    Call OpenRouter to assign sentiment and topic to a single record.
    Returns the record with 'sentiment' and 'topic' fields populated.
    Skip tagging for analytics/orders records that are already tagged.
    """
    if record.get("sentiment") and record.get("topic"):
        return record  # already tagged (e.g. orders)

    prompt = PROMPT_TAG_SENTIMENT_TOPIC.format(text=record["content"][:500])

    try:
        raw = call_openrouter(prompt, max_tokens=64)
        # Strip any accidental markdown fences just in case
        raw = raw.strip().strip("```json").strip("```").strip()
        parsed = json.loads(raw)
        record["sentiment"] = parsed.get("sentiment", "neutral")
        record["topic"] = parsed.get("topic", "general")
    except (json.JSONDecodeError, KeyError, Exception):
        record["sentiment"] = "neutral"
        record["topic"] = "general"

    return record


def tag_all_records(records: list[dict]) -> list[dict]:
    """
    Tag all records sequentially.
    For a hackathon this is fine; in production use asyncio.gather or a queue.
    """
    tagged = []
    for record in records:
        tagged.append(tag_record(record))
    return tagged
