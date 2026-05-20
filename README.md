# KnowledgeLoop MVP

KnowledgeLoop is an AI insight dashboard for e-commerce owners. The MVP proves the core loop:

1. Owner signs up and gets a business workspace.
2. Signals are collected into one normalized table.
3. AI tags sentiment, topics, and urgency.
4. AI generates a plain-English business report.
5. Dashboard shows the latest report, metrics, themes, and signal feed.

## Stack

- Next.js App Router
- Supabase Auth + Postgres + RLS
- Groq LLaMA 3.3 70B for tagging and report generation
- Tailwind CSS

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Create a Supabase project and run:

```text
supabase/schema.sql
```

4. Add these values to `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GROQ_API_KEY=
CRON_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
```

`GROQ_API_KEY` is optional for demo flow. Without it, the app generates a deterministic fallback report.

5. Run the app:

```bash
npm run dev
```

## MVP User Flow

- Visit `/auth/signup`
- Create a workspace
- Click `Load demo data`
- Click `Generate report`
- Use `RAG Chat` to ask follow-up business questions grounded in stored vectors
- Click `Sync GA test data` to append fresh analytics-style signals (also schedulable every 24h)

## API Endpoints

- `POST /api/ingest`: ingest one authenticated signal
- `POST /api/seed`: load demo signals for the current business
- `POST /api/report/generate`: generate and save an insight report
- `POST /api/chat`: business-scoped RAG chat over Pinecone vectors
- `POST /api/integrations/ga4/connect`: GA4 connect scaffold endpoint (test mode response)
- `GET /api/cron/report`: cron placeholder for batch report generation
- `GET /api/cron/collect/shopify`: cron placeholder for store polling
- `GET /api/cron/collect/reviews`: cron placeholder for review polling
- `GET or POST /api/cron/collect/ga4`: appends test GA-style daily signals for all businesses and indexes to Pinecone

## Next Integration Work

- Shopify OAuth and hourly orders/carts/products collector
- Google Business Profile OAuth and review polling
- Facebook/Instagram comments and ratings polling
- GA4 daily page/session/funnel summarization
- Email delivery through Resend
- Slack/WhatsApp critical alerts
