# backend/services/loader.py
import csv
import json
import os
import uuid
from typing import Any

MOCK_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "mock_data")


def _read_csv(filename: str) -> list[dict]:
    path = os.path.join(MOCK_DATA_DIR, filename)
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def _read_json(filename: str) -> Any:
    path = os.path.join(MOCK_DATA_DIR, filename)
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_google_reviews() -> list[dict]:
    rows = _read_csv("google_reviews.csv")
    records = []
    for row in rows:
        records.append({
            "id": row["id"],
            "source": "google_reviews",
            "content": row["text"],
            "sentiment": None,
            "topic": None,
            "urgency": "high" if int(row["star_rating"]) <= 2 else "normal",
            "date": row["date"],
            "meta": {
                "author": row["author"],
                "star_rating": int(row["star_rating"]),
            },
        })
    return records


def load_facebook_comments() -> list[dict]:
    rows = _read_csv("facebook_comments.csv")
    records = []
    for row in rows:
        is_complaint = row.get("post_type", "").lower() == "complaint"
        records.append({
            "id": row["id"],
            "source": "facebook",
            "content": row["text"],
            "sentiment": None,
            "topic": None,
            "urgency": "high" if is_complaint else "normal",
            "date": row["date"],
            "meta": {
                "author": row["author"],
                "post_type": row.get("post_type", "general"),
            },
        })
    return records


def load_support_chats() -> list[dict]:
    rows = _read_csv("support_chats.csv")
    records = []
    for row in rows:
        resolved = row["resolved"].strip().lower() == "true"
        content = row["user_message"]
        if row.get("agent_reply"):
            content += f" | Agent reply: {row['agent_reply']}"
        records.append({
            "id": row["id"],
            "source": "support",
            "content": content,
            "sentiment": None,
            "topic": None,
            "urgency": "high" if not resolved else "normal",
            "date": row["date"],
            "meta": {
                "resolved": resolved,
                "user_message": row["user_message"],
                "agent_reply": row.get("agent_reply", ""),
            },
        })
    return records


def load_analytics() -> list[dict]:
    data = _read_json("analytics.json")
    records = []
    for page in data.get("pages", []):
        content = (
            f"Page {page['page']} had {page['views']} views, "
            f"bounce rate {page['bounce_rate']*100:.1f}%, "
            f"avg session {page['avg_session']}s."
        )
        records.append({
            "id": f"analytics_{page['page'].strip('/').replace('/', '_') or 'home'}",
            "source": "analytics",
            "content": content,
            "sentiment": None,
            "topic": "web_analytics",
            "urgency": "high" if page["bounce_rate"] > 0.55 else "normal",
            "date": "2024-02-15",
            "meta": page,
        })
    return records


def load_orders() -> list[dict]:
    data = _read_json("orders.json")
    records = []
    for item in data.get("bestsellers", []):
        records.append({
            "id": f"order_best_{item['product'].replace(' ', '_').lower()}",
            "source": "orders",
            "content": f"Bestseller: {item['product']} sold {item['units_sold']} units, revenue ${item['revenue']:,.2f}.",
            "sentiment": "positive",
            "topic": "sales_performance",
            "urgency": "normal",
            "date": data["period"]["end"],
            "meta": {**item, "type": "bestseller"},
        })
    for item in data.get("abandoned_carts", []):
        records.append({
            "id": f"order_abandoned_{item['product'].replace(' ', '_').lower()}",
            "source": "orders",
            "content": f"Abandoned cart: {item['product']} abandoned {item['count']} times, avg cart value ${item['avg_cart_value']:.2f}.",
            "sentiment": "negative",
            "topic": "cart_abandonment",
            "urgency": "high",
            "date": data["period"]["end"],
            "meta": {**item, "type": "abandoned_cart"},
        })
    return records


def load_all_records() -> list[dict]:
    """Return all unified records from every mock data source."""
    records: list[dict] = []
    records.extend(load_google_reviews())
    records.extend(load_facebook_comments())
    records.extend(load_support_chats())
    records.extend(load_analytics())
    records.extend(load_orders())
    return records
