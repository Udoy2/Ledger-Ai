# backend/services/embedder.py
"""
In-memory store using pure Python keyword overlap (Jaccard similarity).
Zero external dependencies! This means it will work perfectly on 32-bit Python 
without any complex compilation errors or wheel issues.
"""
import re

_records: list[dict] = []

def _tokenize(text: str) -> set[str]:
    """Simple word tokenization, lowercased, keeping words 3+ chars."""
    words = re.findall(r'\b\w{3,}\b', text.lower())
    return set(words)

def add_records(records: list[dict]) -> None:
    """Store unified records and compute their token sets."""
    global _records
    existing_ids = {r["id"] for r in _records}
    for rec in records:
        if rec["id"] not in existing_ids:
            _records.append({
                "id": rec["id"],
                "content": rec["content"],
                "tokens": _tokenize(rec["content"]),
                "metadata": {
                    "source":    rec.get("source", ""),
                    "sentiment": rec.get("sentiment") or "neutral",
                    "topic":     rec.get("topic") or "general",
                    "urgency":   rec.get("urgency", "normal"),
                    "date":      rec.get("date", ""),
                },
            })

def query(text: str, n_results: int = 5, source_filter: str | None = None) -> list[dict]:
    """Semantic search replacement using Jaccard similarity for keyword overlap."""
    if not _records:
        return []

    if source_filter:
        subset = [r for r in _records if r["metadata"]["source"] == source_filter]
    else:
        subset = _records

    if not subset:
        return []

    query_tokens = _tokenize(text)
    
    # If the query has no valid tokens, just return the first few
    if not query_tokens:
        return [{
            "id": r["id"],
            "content": r["content"],
            "metadata": r["metadata"],
            "distance": 1.0
        } for r in subset[:n_results]]

    # Score using Jaccard Similarity (Intersection over Union)
    scored = []
    for r in subset:
        intersection = len(query_tokens.intersection(r["tokens"]))
        union = len(query_tokens.union(r["tokens"]))
        score = intersection / union if union > 0 else 0
        scored.append((score, r))
    
    # Sort by score descending
    scored.sort(key=lambda x: x[0], reverse=True)
    
    results = []
    for score, r in scored[:n_results]:
        results.append({
            "id": r["id"],
            "content": r["content"],
            "metadata": r["metadata"],
            "distance": float(1.0 - score),  # Distance is 1 - similarity
        })
    return results

def get_all_records(source_filter: str | None = None) -> list[dict]:
    """Return all stored records, optionally filtered by source."""
    if source_filter:
        return [
            {"id": r["id"], "content": r["content"], "metadata": r["metadata"]}
            for r in _records if r["metadata"]["source"] == source_filter
        ]
    return [
        {"id": r["id"], "content": r["content"], "metadata": r["metadata"]} 
        for r in _records
    ]

def record_count() -> int:
    return len(_records)

def clear_collection() -> None:
    """Clear all stored records."""
    global _records
    _records = []
