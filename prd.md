# LedgerAI — Product Requirements Document

**Project Name:** LedgerAI  
**Version:** 0.2.0  
**Status:** Advanced MVP  
**Last Updated:** June 2026

---

## Executive Summary

LedgerAI is an AI-powered insight dashboard and AI CFO orchestrator for e-commerce business owners. It automates the collection of customer signals (GA4, Clarity, reviews, FAQ chats, etc.) from multiple sources, intelligently tags them with sentiment/topics/urgency, and generates plain-English business reports with actionable, evidence-backed recommendations.

The MVP proves the core insight loop with a deterministic fallback report system that works without an LLM, real-time AI tagging when Groq API is available, hybrid RAG retrieval, and a multi-agent CFO orchestration workflow.

---

## Problem Statement

E-commerce owners have fragmented customer signal data scattered across multiple platforms:
- Shopify order data
- Google Business Profile reviews
- Facebook/Instagram comments
- Email support tickets
- Website analytics (GA4, Clarity)
- Customer support chats and FAQs

Without a unified view, they miss patterns, trends, and urgent issues. Manual analysis is time-consuming and error-prone. They need a single dashboard to:
1. See all signals in one place
2. Understand sentiment and urgency
3. Identify recurring themes
4. Get AI-powered strategic recommendations backed by evidence
5. Chat with their data using RAG

---

## Solution

LedgerAI provides a unified dashboard that:
1. **Collects** customer signals from multiple sources
2. **Tags** signals with AI (sentiment, topics, urgency)
3. **Normalizes** all signals into a standard schema and indexes them in a vector DB (Pinecone)
4. **Orchestrates** multi-agent AI CFO runs to generate executive reports and strategic recommendations
5. **Retrieves** evidence via a hybrid RAG system (vector + keyword + reranking)
6. **Engages** customers via an embeddable FAQ widget that acts as a signal learning loop
7. **Displays** metrics, themes, connector health, and orchestration logs in a single dashboard

---

## Core Features (MVP)

### 1. Authentication & Business Workspace
- Email/password signup with Supabase Auth
- Automatic business workspace creation on signup
- Row-level security (RLS) to isolate data by business
- Session-based authentication with Supabase SSR

### 2. Signal Collection
- **Manual ingestion**: POST endpoint to ingest authenticated signals
- **Demo data loader**: Load sample signals for instant dashboard preview
- **Signal schema**: Each signal stores source, type, raw text, sentiment, topics, urgency, metadata
- **Automated Connectors**: Framework for syncing GA4 and Microsoft Clarity

### 3. AI Tagging
- Uses Groq's Llama models for real-time signal tagging
- Falls back to deterministic tags if Groq is unavailable
- Extracts: sentiment (positive/negative/neutral), topics (array of 3 max), urgency (low/medium/high)

### 4. Report Generation
- **AI reports**: Groq generates custom executive summary
- **Fallback reports**: Deterministic algorithm based on signal analysis
- Reports are stored and timestamped for historical tracking

### 5. Dashboard
- **Welcome Card**: Action buttons for Seed, Connectors, AI CFO, Clear Data, Generate Report
- **Report view**: Latest AI-generated report (executive summary + actionable insights)
- **Metrics view**: KPI stat cards
- **Recommendations Drawer**: Displays action items from AI CFO with impact, effort, and evidence
- **Signal feed**: Paginated list of all signals
- **Orchestration Logs**: Trace and memory boards
- **Connector Health**: Shows integrations status
- *(Note: A placeholder search bar has been removed to streamline the UI)*

### 6. RAG Chat
- Business-scoped analyst chat interface via POST `/api/chat`
- Uses hybrid retrieval (Pinecone vector + Supabase keyword) + recency/urgency reranking

### 7. AI CFO Orchestrator
- Multi-agent system (DataQuality, MetricAnalyst, Strategy, Critic, Memory)
- Triggers via `/api/cfo/run` to generate recommendations, long-term memory facts, and tool call traces

### 8. FAQ Widget System
- Embeddable `<script>` and iframe chat UI for external websites
- Owner uploads knowledge docs that scope the retrieval
- Customer Q&A is saved as new signals, creating a continuous learning loop

### 9. Microsoft Clarity Integration
- Syncs UX friction signals (rage clicks, scroll depth) from the Clarity API

### 10. GA4 Integration
- Analyzes and syncs web analytics signals (bounce metrics, funnels)

---

## Technical Architecture

### Frontend Stack
- **Framework**: Next.js 14 (App Router)
- **UI**: React 18, Tailwind CSS, Lucide React
- **Markdown**: React Markdown for rendered reports

### Backend Stack
- **Runtime**: Node.js via Next.js Route Handlers
- **Auth**: Supabase Auth
- **Database**: Supabase PostgreSQL with Row-Level Security (RLS)
- **AI/LLM**: Groq API (LLaMA models for inference and embeddings)
- **Vector DB**: Pinecone (for semantic search and RAG)

### Deployment
- Vercel configuration ready (`vercel.json`)
- Docker containerization ready (`Dockerfile`, `docker-compose.yml`)
- Environment variables for Supabase, Groq, Pinecone, Google, and cron authentication

---

## Database Schema (10 Tables)

1. `businesses`: Workspace, integration tokens, ownership
2. `signals`: Normalized customer and behavior ledger
3. `reports`: Generated executive reports
4. `integration_runs`: Sync state per source connector
5. `ai_runs`: Run metadata and status for orchestrator
6. `tool_calls`: Step-by-step agent trace logs
7. `recommendations`: Structured action outputs with evidence IDs
8. `memories`: Reusable business facts and patterns (LTM)
9. `entities`: Graph nodes (e.g., checkout, mobile_users)
10. `relationships`: Graph edges (e.g., UX issues affecting checkout)

All tables use RLS to scope data strictly to the user's business workspace.

---

## API Endpoints

- `POST /api/ingest`: Ingest one authenticated signal
- `POST /api/seed`: Load demo signals
- `POST /api/report/generate`: Generate an insight report
- `POST /api/chat`: Grounded RAG chat
- `POST /api/cfo/run`: Execute the AI CFO orchestrator
- `POST /api/reset`: Clear all workspace data
- `GET|POST /api/integrations/ga4/connect`: GA4 connect scaffold
- `GET|POST /api/cron/collect/ga4`: GA4 signal collector
- `POST /api/integrations/clarity/connect`: Clarity token connector
- `GET|POST /api/cron/collect/clarity`: Clarity signal collector
- `GET /api/cron/collect/shopify`: Shopify collector (stub)
- `GET /api/cron/collect/reviews`: Reviews collector (stub)
- `GET /api/cron/report`: Cron report generation
- `POST /api/integrations/faq-widget/connect`: Generate widget embed key
- `POST|GET /api/integrations/faq-widget/docs`: Upload and list FAQ docs
- `GET /api/embed/widget.js?key=...`: Embeddable FAQ script
- `POST /api/embed/faq/chat`: FAQ chat endpoint for visitors

---

## AI/LLM Integration

- **Signal Tagging**: Sentiment, topics, urgency extraction (Groq LLaMA)
- **Report Generation**: Narrative generation
- **AI CFO**: Strategic synthesis and agent orchestration
- **Hybrid RAG**: Uses Groq embeddings to index signals into Pinecone, combined with keyword search for high-recall candidate generation and reranking
- **Fallback System**: Deterministic taggers and report generators when APIs are missing, allowing full demo capabilities offline

---

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=          
NEXT_PUBLIC_SUPABASE_ANON_KEY=     
SUPABASE_SERVICE_ROLE_KEY=         
GROQ_API_KEY=                      
PINECONE_API_KEY=                  
PINECONE_INDEX=                    
GOOGLE_CLIENT_ID=                  
GOOGLE_CLIENT_SECRET=              
CRON_SECRET=                       
```

---

## Current Status & Scope

### ✅ Completed
- Email/password authentication, workspace creation, and RLS
- Multi-source ingestion framework (API, Seed, Clarity, GA4)
- AI CFO Orchestrator (Recommendations, Trace, Memory)
- Hybrid RAG retrieval pipeline and business analyst chat
- FAQ Widget embed loop (docs upload, iframe chat, signal ingestion)
- Pinecone vector indexing pipeline
- Dashboard with metrics, themes, trace logs, and evidence drawers
- Complete deterministic fallback mode
- Docker and Vercel deployment configs

### 🔄 Planned (Post-MVP)
- **Shopify OAuth**: Hourly polling of orders, products, cart abandonment
- **Google Business Profile**: Daily review ingestion and tagging
- **Social Media**: Facebook/Instagram comment polling
- **Email/Alerts**: Resend delivery, Slack/WhatsApp notifications
- **Multi-user**: Team collaboration and role-based access

---

## File Structure

```
├── app/
│   ├── api/
│   │   ├── ingest/, seed/, reset/, chat/, cfo/run/, report/generate/
│   │   ├── cron/ (collect/ga4, collect/clarity, collect/shopify, collect/reviews, report)
│   │   ├── integrations/ (ga4, clarity, faq-widget)
│   │   └── embed/ (widget.js, faq/chat)
│   ├── auth/ (login, signup)
│   ├── dashboard/page.tsx
│   ├── embed/ (faq iframe pages)
│   ├── judge/, pitch/
│   └── layout.tsx, page.tsx, globals.css
├── components/
│   ├── AuthForm.tsx, DashboardClient.tsx, FaqSetupPanel.tsx
│   └── LazyDashboardWidgets.tsx, RagChat.tsx, ThemeToggle.tsx
├── lib/
│   ├── ai.ts, ai-config.ts, auth.ts, backfill.ts, connectors.ts, demo.ts
│   ├── embeddings.ts, env.ts, faq-docs.ts, faq-widget.ts, google-auth.ts
│   ├── groq.ts, hybrid-rag.ts, index-signal.ts, pinecone.ts, rag.ts, types.ts
│   ├── providers/ (clarity.ts)
│   └── supabase/ (client.ts, server.ts, admin.ts)
├── supabase/
│   └── schema.sql
├── docs/ (JUDGE_PRD.md, Pitch decks)
├── Dockerfile, docker-compose.yml
├── vercel.json, package.json, next.config.mjs, tsconfig.json, tailwind.config.ts
└── README.md, prd.md, AGENTS.md, CLAUDE.MD, project_review.md
```
