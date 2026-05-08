# backend/services/openrouter.py
import os
import requests
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = "google/gemini-2.0-flash-exp:free"

# ---------------------------------------------------------------------------
# Prompt constants — all prompts are defined here, never inline
# ---------------------------------------------------------------------------

PROMPT_TAG_SENTIMENT_TOPIC = """You are a business intelligence tagger. Analyze the following customer text and return a JSON object with exactly two fields:
- "sentiment": one of "positive", "neutral", or "negative"
- "topic": a short snake_case label (e.g. "delivery_speed", "product_quality", "return_policy", "shipping_cost", "customer_support", "product_sizing", "order_tracking", "general_praise", "international_shipping", "pricing")

Return ONLY the JSON object. No markdown, no explanation.

Text: {text}"""

PROMPT_CROSS_SOURCE_PATTERNS = """You are a senior business analyst. Below are customer feedback records from multiple sources (Google Reviews, Facebook, Support Chats). Identify the top 5 recurring themes or patterns across ALL sources combined.

Records:
{records}

Return a JSON array of objects. Each object must have:
- "theme": short title of the pattern
- "description": 1-2 sentence explanation
- "sources": array of source names where this pattern appears
- "frequency": estimated number of mentions
- "sentiment": overall sentiment ("positive", "neutral", or "negative")

Return ONLY the JSON array. No markdown, no explanation."""

PROMPT_TREND_ANALYSIS = """You are a business intelligence analyst. Compare this week's customer feedback vs last week's across each data source.

This week's data:
{this_week}

Last week's data:
{last_week}

Return a JSON array of trend objects. Each object must have:
- "source": the data source name
- "trend": "improving", "declining", or "stable"
- "key_change": one sentence describing the main change
- "sentiment_shift": numeric change in positive sentiment percentage (e.g. +12 or -8)

Return ONLY the JSON array. No markdown, no explanation."""

PROMPT_OPPORTUNITY_SCORING = """You are a product growth strategist. Below are grouped customer issues with frequency and sentiment data. Rank the top 5 opportunities by business impact (frequency × urgency × sentiment severity).

Issues:
{issues}

Return a JSON array of opportunity objects sorted by score descending. Each object must have:
- "issue": short issue title
- "score": numeric score out of 100
- "frequency": number of occurrences
- "sentiment": "positive", "neutral", or "negative"
- "recommendation": one actionable sentence to address this issue

Return ONLY the JSON array. No markdown, no explanation."""

PROMPT_CHAT_RAG = """You are a helpful customer support assistant for an online retail brand. Use the following knowledge base excerpts to answer the customer's question accurately and concisely. If the answer is not in the knowledge base, say so politely and suggest contacting support.

Knowledge base:
{context}

Customer question: {question}

Respond in plain English, 2-4 sentences maximum."""

PROMPT_REVIEW_RESPOND = """You are a professional customer relations manager. Write a thoughtful, brand-appropriate reply to the following customer review. Be empathetic for negative reviews and grateful for positive ones. Keep it under 80 words.

Review (rating: {rating} stars):
{review_text}

Return ONLY the reply text. No labels, no markdown."""

PROMPT_WEEKLY_REPORT = """You are a chief business intelligence officer. Based on the following aggregated data from this week, write a comprehensive weekly performance report.

Data:
{data}

The report must include:
1. Executive Summary (2-3 sentences)
2. Customer Sentiment Overview
3. Top Issues to Address
4. Wins and Positive Signals
5. Recommended Actions for Next Week

Write in professional prose. Use clear section headers. Keep the total report under 600 words."""

PROMPT_GENERATE_FAQ_ANSWER = """You are a helpful customer support specialist. Generate a clear, accurate, and friendly FAQ answer for the following unanswered customer question. The answer should be 2-4 sentences.

Question: {question}

Return ONLY the answer text. No labels, no markdown."""


# ---------------------------------------------------------------------------
# Core API caller
# ---------------------------------------------------------------------------

def call_openrouter(prompt: str, max_tokens: int = 1024) -> str:
    """Send a prompt to OpenRouter and return the text response."""
    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY is not set in environment variables.")

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": OPENROUTER_MODEL,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }
    response = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=30)
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]
