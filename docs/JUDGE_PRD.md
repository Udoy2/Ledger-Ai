# PulseDesk Technical PRD

## 1. Design Philosophy

PulseDesk is designed as an **operator-first intelligence system** for small and medium businesses. The product is intentionally opinionated:

1. **Evidence before opinion**  
   Every recommendation should be backed by raw customer/behavior signals and retrievable evidence IDs.

2. **Determinism where possible, LLM where useful**  
   Non-creative tasks (routing, filtering, scoring, formatting, orchestration state transitions) stay deterministic to reduce cost and drift.

3. **Composable ingestion and memory**  
   Every source (GA4, Clarity, reviews, website FAQ) normalizes into one schema so the same downstream analysis can operate across all channels.

4. **Free-tier viability by default**  
   Architecture is constrained to low-cost primitives: Supabase Postgres + RLS, Pinecone Starter, Groq free tier.

5. **Operational transparency**  
   Agents are not a black box. Runs, tool calls, recommendations, and memory are inspectable.

---

## 2. Product Purpose

Businesses have fragmented insight surfaces:
- Analytics tools show behavior but not intent.
- Review tools show sentiment but not conversion context.
- Support/FAQ chats show objections but are often unstructured.

PulseDesk unifies these signals to answer:
- What is the most important issue right now?
- Which action has the best impact/effort ratio?
- What evidence supports this recommendation?
- Did previous recommendations improve outcomes?

---

## 3. Primary Users

- **Business Owner / Operator**: needs clear actions, not dashboards only.
- **Growth/Marketing Lead**: needs conversion diagnostics from mixed data.
- **Technical Judge / Engineer**: needs inspectable infra and reliability.
- **Investor / Sponsor**: needs credible path to scalable product economics.

---

## 4. System Overview

High-level pipeline:

`collect -> normalize -> store -> index -> retrieve -> reason -> recommend -> remember`

Data plane:
- `signals` table is canonical signal ledger.
- Pinecone namespace per business stores vectorized chunks.
- Hybrid retriever merges keyword + vector signals.

Control plane:
- `ai_runs` tracks orchestration execution.
- `tool_calls` tracks agent/tool steps.
- `recommendations`, `memories`, `entities`, `relationships` track long-term decision graph.

---

## 5. Tech Stack

Frontend:
- Next.js 14 App Router
- React 18
- Tailwind CSS
- Lucide icons

Backend:
- Next.js Route Handlers (Node runtime)
- Supabase Auth + Postgres + RLS
- Pinecone (Starter)
- Groq API (LLM + embeddings path)

Core Libraries:
- `@supabase/supabase-js`
- `@pinecone-database/pinecone`
- `groq-sdk`
- `react-markdown`

---

## 6. Data Model

### Core Existing Tables
- `businesses`: workspace, integration tokens, ownership
- `signals`: normalized facts from all channels
- `reports`: generated executive reports
- `integration_runs`: sync state per source

### AI Infra Tables
- `ai_runs`: run metadata and status
- `tool_calls`: step-by-step trace for orchestration
- `recommendations`: structured action outputs with evidence IDs
- `memories`: reusable business facts/patterns
- `entities`: graph nodes (`checkout`, `mobile_users`, etc.)
- `relationships`: graph edges (`delivery_clarity affects checkout`)

Security:
- RLS enabled for all tables
- policies scoped by `business_id -> businesses.owner_id -> auth.uid()`

---

## 7. Retrieval Architecture (Hybrid RAG)

Implemented in `lib/hybrid-rag.ts`.

### 7.1 Query Processing
- Deterministic tokenization
- Stop-word removal
- Rule-based synonym expansion (query rewrite)

### 7.2 Candidate Generation
- Vector retrieval from Pinecone namespace (`business-{id}`)
- Keyword retrieval from Supabase `signals`

### 7.3 Reranking
Weighted fusion:
- vector score
- keyword score
- recency boost
- urgency boost

This creates robust retrieval in low-data and noisy-data scenarios.

### 7.4 Scoped Retrieval
FAQ endpoint uses strict source/type constraints:
- source: `website_faq_docs`
- type: `faq_knowledge_doc`

This guarantees “answer from uploaded docs only” behavior.

---

## 8. Agent and Orchestration Model

Route: `POST /api/cto/run`

Agent graph (lightweight, not over-engineered):
- `DataQualityAgent`
- `MetricAnalystAgent`
- `StrategyAgent`
- `CriticAgentDeterministic`
- `MemoryAgent`

Execution strategy:
- deterministic pre/post processing
- single LLM call for strategic synthesis (optional fallback)
- strict critic gating for minimum output quality
- persisted trace for explainability

Cost-control principle:
- avoid multi-agent LLM fan-out
- keep critic deterministic where possible

---

## 9. FAQ Widget Architecture

Goal: one-script integration for business websites.

### 9.1 Setup
- Owner calls `POST /api/integrations/faq-widget/connect`
- System returns:
  - `embed_key`
  - `<script src="/api/embed/widget.js?key=...">`

### 9.2 Runtime
- `GET /api/embed/widget.js` mounts iframe
- iframe page `/embed/faq` handles chat UI
- chat posts to `POST /api/embed/faq/chat`

### 9.3 Knowledge Restriction
- FAQ retrieval scoped to uploaded docs only
- no doc evidence => safe “insufficient docs” response

### 9.4 Continuous Learning
- each visitor Q/A is inserted into `signals` as `website_faq_agent`
- conversation also indexed into Pinecone for future analysis and reporting

---

## 10. Integrations and APIs

### 10.1 GA4
- connect scaffold: `POST /api/integrations/ga4/connect`
- collector: `GET|POST /api/cron/collect/ga4`
- stores summarized analytics-like signals

### 10.2 Microsoft Clarity
- connect: `POST /api/integrations/clarity/connect`
- collector: `GET|POST /api/cron/collect/clarity`
- supports `numOfDays` and `dimension1`
- uses token auth (`Authorization: Bearer`)
- fallback demo mode supported

### 10.3 FAQ Docs
- upload docs: `POST /api/integrations/faq-widget/docs`
- list docs: `GET /api/integrations/faq-widget/docs`

### 10.4 Report Generation
- `POST /api/report/generate`
- supports prompt and optional date range filtering (`start`, `end`)

### 10.5 RAG Chat
- `POST /api/chat`
- hybrid retrieval + grounded response generation

---

## 11. Workflow (End-to-End)

1. Business creates account/workspace.  
2. Connects one or more sources (GA4, Clarity, FAQ widget).  
3. Signals are collected and normalized into `signals`.  
4. Signals are chunked and indexed into Pinecone.  
5. Owner runs report or AI CTO orchestrator.  
6. Hybrid retrieval selects relevant evidence.  
7. LLM produces structured recommendations (or deterministic fallback).  
8. Recommendations, trace, memory are persisted.  
9. Dashboard displays metrics, evidence drawer, trace, memory.  
10. Owner takes action and observes future metric shifts.

---

## 12. Performance Strategy

Backend optimizations:
- bulk inserts for connectors and FAQ docs
- bounded-concurrency indexing batches
- merged write operations in orchestration
- scoped retrieval scan limits
- FAQ business-key lookup caching

Frontend optimizations:
- dynamic import of heavy interactive widgets
- selective render payload limits
- app-router refresh instead of full reload

---

## 13. Reliability and Failure Modes

1. **LLM unavailable**  
   Deterministic fallbacks for report/recommendations remain operational.

2. **Vector retrieval degraded**  
   Keyword retrieval path still returns candidates.

3. **Missing AI infra tables**  
   CTO route supports stateless mode while warning about persistence.

4. **Integration token invalid**  
   Collectors degrade to demo mode or emit explicit auth errors.

---

## 14. Security Model

- Supabase Auth controls user identity.
- RLS enforces tenant isolation by `business_id`.
- Service-role operations restricted to backend-only routes.
- FAQ widget supports allowlisted origins.
- Embed key acts as scoped runtime credential for public FAQ endpoint.

---

## 15. Cost and Unit Economics (Free-Tier Orientation)

Main cost vectors:
- LLM tokens (Groq)
- vector DB operations (Pinecone)
- DB and egress (Supabase)

Cost controls:
- deterministic preprocessing and critic gating
- minimal LLM calls per workflow
- hybrid retrieval to improve answer quality without extra tokens
- summarized ingestion over raw event firehoses

Result: usable demo and early production behavior inside free-tier limits.

---

## 16. Scalability Path

Near-term:
- stronger recommendation outcome tracking (`outcomes` table)
- scheduler improvements and retry policy
- connector expansion (Shopify, GBP reviews)

Mid-term:
- queue-based ingestion workers
- cache layer for hot retrieval paths
- model routing by task complexity

Long-term:
- multi-workspace policy/roles
- portfolio-level insights
- benchmark harness for recommendation quality and business impact

---

## 17. Why This Is Defensible

Technical moat emerges from:
- normalized cross-source signal graph
- evidence-linked recommendation history
- business-specific memory and behavior feedback loop
- low-cost, explainable orchestration that operators trust

This combination is difficult to replicate with a generic chatbot wrapper.

---

## 18. Current Status

Implemented:
- multi-source ingestion foundation
- hybrid RAG
- AI CTO orchestration with trace
- FAQ widget + doc-only answer mode
- memory + recommendation persistence
- performance and bloat reductions across frontend/backend

In progress roadmap:
- richer real-source connectors
- recommendation impact measurement
- further automation and monitoring controls

