# LedgerAI MVP

LedgerAI is an AI insight dashboard for e-commerce owners. The MVP proves the core loop:

1. Owner signs up and gets a business workspace.
2. Signals are collected into one normalized table from various integrations (GA4, Clarity, FAQ widgets, etc.).
3. AI tags sentiment, topics, and urgency.
4. AI generates a plain-English business report and a multi-agent AI CFO orchestrator provides strategic recommendations.
5. Dashboard shows the latest report, metrics, themes, recommendations with evidence, orchestration trace, and signal feed.

## Stack

- Next.js 14 App Router, React 18, TypeScript, Tailwind CSS
- Supabase Auth + Postgres + RLS
- Groq LLaMA models for tagging, reports, chat, embeddings, and strategic synthesis
- Pinecone for vector DB and semantic retrieval
- Google APIs (GA4 integration)
- React Markdown, Lucide React icons

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
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
PINECONE_API_KEY=
PINECONE_INDEX=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
CRON_SECRET=
```

`GROQ_API_KEY` and other integration keys are optional for the demo flow. Without them, the app generates deterministic fallback responses and loads demo data.

5. Run the app:

```bash
npm run dev
```

Alternatively, you can use Docker:
```bash
docker-compose up
```

## MVP User Flow

- Visit `/auth/signup` or landing page
- Create a workspace
- Click `Load demo data` to see the dashboard populated with test signals
- Click `Generate report`
- Run the `AI CFO` orchestrator to generate strategic recommendations, evidence, and trace logs
- Use `RAG Chat` to ask follow-up business questions grounded in stored vectors and memory
- Connect and sync `Clarity` or `GA4` for real telemetry
- Use the `FAQ widget` to embed a customer-facing assistant that answers from uploaded docs and creates a signal feedback loop

## AI Usage

<img width="1926" height="2048" alt="image" src="https://github.com/user-attachments/assets/312ff543-8e04-4c89-be57-571f9f4c21e1" />

## API Endpoints

- `POST /api/ingest`: ingest one authenticated signal
- `POST /api/seed`: load demo signals for the current business
- `POST /api/report/generate`: generate and save an insight report
- `POST /api/chat`: business-scoped RAG chat over Pinecone vectors
- `POST /api/cfo/run`: runs lightweight multi-agent orchestration, stores run trace, recommendations, memory, and graph relationships
- `POST /api/reset`: permanently clears all workspace data
- `GET|POST /api/integrations/ga4/connect`: GA4 connect scaffold endpoint
- `GET|POST /api/cron/collect/ga4`: appends GA4 daily signals for businesses and indexes to Pinecone
- `POST /api/integrations/clarity/connect`: connects Microsoft Clarity API token
- `GET|POST /api/cron/collect/clarity`: appends Clarity UX friction signals (rage clicks, scroll depth)
- `GET /api/cron/report`: cron placeholder for batch report generation
- `GET /api/cron/collect/shopify`: cron placeholder for store polling
- `GET /api/cron/collect/reviews`: cron placeholder for review polling
- `POST /api/integrations/faq-widget/connect`: generates reusable website widget embed key and script
- `GET /api/embed/widget.js?key=...`: embeddable JS that mounts the customer-facing FAQ iframe
- `POST /api/embed/faq/chat`: public FAQ endpoint, hybrid retrieval answer, and automatic signal ingestion
- `POST|GET /api/integrations/faq-widget/docs`: FAQ doc upload and list

## Next Integration Work

- Shopify OAuth and hourly orders/carts/products collector
- Google Business Profile OAuth and review polling
- Facebook/Instagram comments and ratings polling
- Email delivery through Resend
- Slack/WhatsApp critical alerts
