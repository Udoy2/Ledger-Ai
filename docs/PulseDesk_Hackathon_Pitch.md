# PulseDesk Hackathon Pitch Deck

## Slide 1: PulseDesk

# PulseDesk

### AI-powered SME intelligence dashboard

**Most dashboards tell SMEs what happened. PulseDesk tells them what to do next, why, and what evidence proves it.**

Hackathon challenge: **SME Dashboard**

---

## Slide 2: Problem and Motivation

SME owners have business signals scattered across analytics, reviews, checkout behavior, support chats, FAQ questions, and social comments.

The problem is not lack of data. The problem is lack of **decision clarity**.

Most SMEs do not have a data analyst, BI team, or growth operations team. They need a dashboard that can:

- unify fragmented business data,
- explain what matters in plain English,
- identify urgent risks and opportunities,
- recommend practical next steps,
- connect every recommendation back to evidence.

PulseDesk gives SME owners a lightweight intelligence loop usually only available to larger companies.

---

## Slide 3: Product Solution

PulseDesk is an operator-first dashboard that turns multi-source business signals into decisions.

Core product loop:

```text
collect -> normalize -> store -> index -> retrieve -> reason -> recommend -> remember
```

User-facing features:

- KPI overview and signal feed
- AI-generated executive report
- RAG-powered analyst chat
- AI CTO recommendations
- evidence drawer for recommendation support
- orchestration logs and memory
- FAQ widget that turns customer questions into new signals

The UX is designed for SMEs: practical recommendations instead of complex reporting.

---

## Slide 4: Technical Architecture

Frontend:

- Next.js App Router
- React
- Tailwind CSS
- dynamic/lazy client widgets for heavier AI panels

Backend:

- Next.js route handlers
- Supabase Auth
- Supabase Postgres
- Row-Level Security for tenant isolation

AI and retrieval:

- Groq chat models for tagging, reports, chat, and strategic synthesis
- Groq embedding path with deterministic fallback embeddings
- Pinecone for vector search
- Supabase keyword retrieval
- hybrid RAG reranker

Deployment-ready pieces:

- Vercel config
- cron endpoints
- Supabase schema
- deterministic demo mode

---

## Slide 5: Data Model and Signal Layer

PulseDesk is built around one canonical ledger: `signals`.

Each signal stores:

- `business_id`
- `source`
- `type`
- `raw_text`
- `sentiment`
- `topics`
- `urgency`
- `metadata`
- `collected_at`

Important tables:

- `businesses`: workspace and integration config
- `signals`: normalized customer and behavior ledger
- `reports`: generated executive reports
- `integration_runs`: connector sync state
- `ai_runs`: orchestration run metadata
- `tool_calls`: step-by-step agent trace
- `recommendations`: structured actions
- `memories`: reusable business facts
- `entities` and `relationships`: lightweight business graph

This lets the dashboard, RAG system, reports, and agents all operate from the same evidence base.

---

## Slide 6: AI Usage and Model Strategy

PulseDesk uses AI where it adds decision value, and deterministic logic where reliability/cost matters.

AI tasks:

- **Signal tagging:** sentiment, topics, urgency
- **Report generation:** executive summary and action list
- **Analyst chat:** grounded Q&A over business signals
- **FAQ assistant:** customer-facing answers from uploaded docs only
- **AI CTO:** strategic recommendations with evidence

Model routing:

- **Fast model:** tagging, FAQ, analyst chat
- **Smart model:** executive reports and AI CTO strategy
- **Embedding model:** vector indexing and semantic retrieval

Efficiency decisions:

- one strategic LLM call inside CTO orchestration,
- deterministic critic filtering,
- deterministic query rewrite,
- fallback reports and extractive answers when Groq is unavailable,
- non-fatal vector indexing when Pinecone is unavailable.

---

## Slide 7: Hybrid RAG Pipeline

PulseDesk uses hybrid RAG because SME data is sparse, noisy, and short-form.

Pipeline:

```text
user/business question
  -> deterministic query rewrite
  -> embedding generation
  -> Pinecone vector retrieval
  -> Supabase keyword retrieval
  -> metadata filters by business/source/type/date
  -> rerank with vector score + keyword score + recency + urgency
  -> build evidence context
  -> LLM answer/report/recommendation
```

Reranking signals:

- semantic vector match
- exact keyword/topic overlap
- urgency boost
- recency boost
- strict business namespace

Result: better evidence retrieval with lower hallucination risk.

---

## Slide 8: AI CTO Orchestration

PulseDesk includes a lightweight AI CTO workflow.

Agents/stages:

- `DataQualityAgent`: checks signal volume and source coverage
- `MetricAnalystAgent`: retrieves relevant evidence with hybrid RAG
- `StrategyAgent`: generates practical recommendations
- `CriticAgentDeterministic`: filters weak or incomplete recommendations
- `MemoryAgent`: stores reusable business facts and graph relationships

Design choice:

This is not expensive multi-agent fan-out. It is a controlled workflow:

```text
deterministic prep -> one strategic LLM call -> deterministic critic -> persistence
```

Outputs are persisted in:

- `ai_runs`
- `tool_calls`
- `recommendations`
- `memories`
- `entities`
- `relationships`

This makes the AI process inspectable rather than a black box.

---

## Slide 9: FAQ Widget and Learning Loop

PulseDesk includes an embeddable FAQ assistant for SME websites.

Technical flow:

```text
owner uploads docs
  -> docs become website_faq_docs signals
  -> docs are chunked and indexed
  -> embed script mounts iframe
  -> visitor asks question
  -> RAG retrieves only FAQ doc signals
  -> assistant answers from uploaded docs only
  -> Q&A is saved as website_faq_agent signal
  -> conversation becomes future business intelligence
```

Why this matters:

- answers customers immediately,
- captures repeated objections,
- feeds the business dashboard,
- helps owners discover what customers do not understand.

This turns support questions into product and conversion insights.

---

## Slide 10: Security, Performance, and Cost

Security:

- Supabase Auth
- Row-Level Security on all core tables
- business-scoped data access
- Pinecone namespace per business
- backend-only service role operations
- FAQ embed keys and optional origin allowlisting

Performance:

- dashboard queries request exact columns instead of `select('*')`
- heavy chat/FAQ dashboard widgets lazy-load below the fold
- vector indexing is batched
- retrieval scan limits are bounded
- deterministic fallback paths avoid failed user flows

Free-tier viability:

- Supabase free tier for auth and database
- Groq free tier for LLM tasks
- Pinecone starter for vectors
- fast model for frequent small tasks
- smart model only where reasoning quality matters

---

## Slide 11: Closing

# PulseDesk

### An AI dashboard for SME operators.

PulseDesk helps small businesses:

- understand performance,
- identify risks,
- find opportunities,
- act with confidence,
- and trace every recommendation back to evidence.

**It is not just analytics. It is an AI-powered decision loop for SMEs.**
