# backend/main.py
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from services.db import init_db
from routes.ingest import router as ingest_router
from routes.chat import router as chat_router
from routes.reviews import router as reviews_router
from routes.insights import router as insights_router
from routes.gaps import router as gaps_router
from routes.report import router as report_router

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize the database on startup."""
    init_db()
    yield


app = FastAPI(
    title="KnowledgeLoop API",
    description="Self-improving business intelligence platform for hackathon MVP.",
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS — allow the Next.js / Vite dev server on port 3000 / 5173
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(ingest_router)
app.include_router(chat_router)
app.include_router(reviews_router)
app.include_router(insights_router)
app.include_router(gaps_router)
app.include_router(report_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "KnowledgeLoop API"}
