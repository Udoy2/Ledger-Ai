# backend/services/db.py
import sqlite3
import os
from typing import Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "knowledgeloop.db")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create all tables if they do not already exist."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS unanswered_questions (
            id          TEXT PRIMARY KEY,
            source      TEXT NOT NULL,
            question    TEXT NOT NULL,
            date        TEXT NOT NULL,
            reviewed    INTEGER NOT NULL DEFAULT 0
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS approved_faqs (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            question    TEXT NOT NULL,
            answer      TEXT NOT NULL,
            source_id   TEXT,
            approved_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)

    conn.commit()
    conn.close()


def insert_unanswered_question(
    record_id: str,
    source: str,
    question: str,
    date: str,
) -> None:
    conn = get_connection()
    conn.execute(
        """
        INSERT OR IGNORE INTO unanswered_questions (id, source, question, date)
        VALUES (?, ?, ?, ?)
        """,
        (record_id, source, question, date),
    )
    conn.commit()
    conn.close()


def get_unanswered_questions() -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM unanswered_questions WHERE reviewed = 0 ORDER BY date DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def approve_faq(question_id: str, answer: str) -> dict:
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM unanswered_questions WHERE id = ?", (question_id,)
    ).fetchone()
    if not row:
        conn.close()
        return {}
    conn.execute(
        "INSERT INTO approved_faqs (question, answer, source_id) VALUES (?, ?, ?)",
        (row["question"], answer, question_id),
    )
    conn.execute(
        "UPDATE unanswered_questions SET reviewed = 1 WHERE id = ?", (question_id,)
    )
    conn.commit()
    result = dict(row)
    conn.close()
    return result


def get_approved_faqs() -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM approved_faqs ORDER BY approved_at DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]
