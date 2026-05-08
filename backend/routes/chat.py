# backend/routes/chat.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.embedder import query, record_count
from services.openrouter import call_openrouter, PROMPT_CHAT_RAG

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    question: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[dict]


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """RAG chat endpoint: retrieve relevant chunks then synthesize an answer."""
    if record_count() == 0:
        raise HTTPException(
            status_code=503,
            detail="Knowledge base is empty. Please call POST /ingest first.",
        )

    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question must not be empty.")

    # 1. Retrieve top-5 semantically relevant chunks
    chunks = query(text=question, n_results=5)
    if not chunks:
        return ChatResponse(
            answer="I couldn't find relevant information. Please contact support directly.",
            sources=[],
        )

    # 2. Build context string from retrieved chunks
    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        src = chunk["metadata"].get("source", "unknown")
        context_parts.append(f"[{i}] ({src}): {chunk['content']}")
    context = "\n".join(context_parts)

    # 3. Call OpenRouter with RAG prompt
    prompt = PROMPT_CHAT_RAG.format(context=context, question=question)
    answer = call_openrouter(prompt, max_tokens=256)

    # 4. Return answer + source references
    sources = [
        {
            "id": c["id"],
            "source": c["metadata"].get("source"),
            "snippet": c["content"][:120] + "...",
        }
        for c in chunks[:3]
    ]

    return ChatResponse(answer=answer, sources=sources)
