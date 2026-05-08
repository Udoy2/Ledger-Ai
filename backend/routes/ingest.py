# backend/routes/ingest.py
from fastapi import APIRouter
from pydantic import BaseModel
from services.loader import load_all_records
from services.tagger import tag_all_records
from services.embedder import add_records, clear_collection, record_count
from services.db import insert_unanswered_question

router = APIRouter(prefix="/ingest", tags=["ingest"])


class IngestResponse(BaseModel):
    status: str
    total_records: int
    tagged: int
    embedded: int
    unanswered_questions_stored: int


@router.post("", response_model=IngestResponse)
async def ingest_all():
    """
    Load all mock data, tag with AI, embed into ChromaDB,
    and persist unresolved support questions to SQLite.
    Safe to call multiple times — clears and re-ingests.
    """
    # 1. Clear existing collection for idempotent re-ingest
    clear_collection()

    # 2. Load all sources into unified records
    records = load_all_records()
    total = len(records)

    # 3. AI tagging — assigns sentiment + topic via OpenRouter
    tagged_records = tag_all_records(records)
    tagged_count = sum(1 for r in tagged_records if r.get("sentiment") and r.get("topic"))

    # 4. Embed into ChromaDB
    add_records(tagged_records)
    embedded = record_count()

    # 5. Persist unanswered support questions to SQLite
    unanswered_count = 0
    for record in tagged_records:
        if record["source"] == "support":
            meta = record.get("meta", {})
            if not meta.get("resolved", True) and meta.get("user_message"):
                insert_unanswered_question(
                    record_id=record["id"],
                    source=record["source"],
                    question=meta["user_message"],
                    date=record["date"],
                )
                unanswered_count += 1

    return IngestResponse(
        status="success",
        total_records=total,
        tagged=tagged_count,
        embedded=embedded,
        unanswered_questions_stored=unanswered_count,
    )
