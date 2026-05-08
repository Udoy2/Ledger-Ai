# KnowledgeLoop MVP - Product Requirements Document

**Project Name:** KnowledgeLoop MVP  
**Version:** 0.1.0  
**Status:** Early MVP  
**Last Updated:** May 2026

---

## Executive Summary

KnowledgeLoop is an AI-powered insight dashboard for e-commerce business owners. It automates the collection of customer signals (reviews, feedback, chats, orders) from multiple sources, intelligently tags them with sentiment/topics/urgency, and generates plain-English business reports with actionable recommendations.

The MVP proves the core insight loop with a deterministic fallback report system that works without an LLM, plus real-time AI tagging when Groq API is available.

---

## Problem Statement

E-commerce owners have fragmented customer signal data scattered across multiple platforms:
- Shopify order data
- Google Business Profile reviews
- Facebook/Instagram comments
- Email support tickets
- Website analytics

Without a unified view, they miss patterns, trends, and urgent issues. Manual analysis is time-consuming and error-prone. They need a single dashboard to:
1. See all signals in one place
2. Understand sentiment and urgency
3. Identify recurring themes
4. Get AI-powered recommendations

---

## Solution

KnowledgeLoop provides a unified dashboard that:
1. **Collects** customer signals from multiple sources (with OAuth integrations)
2. **Tags** signals with AI (sentiment, topics, urgency)
3. **Normalizes** all signals into a standard schema
4. **Generates** executive reports with actionable insights
5. **Displays** metrics, themes, and signal feed in a single dashboard

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

### 3. AI Tagging
- Uses Groq's Llama 3.3 70B model (free tier) for real-time signal tagging
- Falls back to deterministic tags if Groq is unavailable
- Extracts: sentiment (positive/negative/neutral), topics (array of 3 max), urgency (low/medium/high)
- Fast inference (~0.5s per signal)

### 4. Report Generation
- **AI reports** (with Groq): Groq generates custom executive summary
- **Fallback reports** (without Groq): Deterministic algorithm based on signal analysis
- Reports include: Executive summary, top problem, top opportunity, what's working, action list, signal summary
- Reports are stored and timestamped for historical tracking

### 5. Dashboard
- **Report view**: Latest AI-generated report (executive summary + actionable insights)
- **Metrics view**: Signal counts by sentiment, source, urgency
- **Themes view**: Most frequently occurring topics across all signals
- **Signal feed**: Paginated list of all signals with filtering/sorting capabilities
- **Demo loading**: One-click demo data loader to test the full flow

### 6. Signal Ingestion API
- Authenticated POST endpoint at `/api/ingest`
- Accepts signal object with: source, type, raw_text, optional metadata
- Automatically triggers AI tagging
- Returns tagged signal with sentiment, topics, urgency

---

## Technical Architecture

### Frontend Stack
- **Framework**: Next.js 14 (App Router)
- **UI**: React 18 with Tailwind CSS
- **Icons**: Lucide React
- **Markdown**: React Markdown for rendered reports

### Backend Stack
- **Runtime**: Node.js via Next.js
- **Auth**: Supabase Auth (email/password)
- **Database**: Supabase PostgreSQL with Row-Level Security (RLS)
- **AI/LLM**: Groq Llama 3.3 70B (free tier API)
- **Vector DB**: Pinecone (prepared for RAG use cases; not yet active)

### Deployment
- Vercel configuration ready (`vercel.json`)
- Environment variables for Supabase, Groq, and cron authentication
- Dev server runs on `npm run dev` (localhost:3000)

---

## Database Schema

### Tables

#### `businesses`
- Primary workspace/account level
- Fields: id, owner_id (FK to auth.users), name, industry, brand_voice
- OAuth token storage: shopify_domain/token, woo_domain/token, google_token, facebook_token, instagram_token, ga4_property_id
- Security: RLS policy restricts to owner
- Trigger: Auto-creates business record on user signup

#### `signals`
- Normalized customer feedback/data points
- Fields: id, business_id (FK), source, type, raw_text, sentiment, topics (array), urgency, metadata (jsonb), collected_at
- Security: RLS restricts to user's own business signals
- Indexes: business_id + collected_at (main query pattern), business_id + source, business_id + urgency
- Check constraints: sentiment (positive/negative/neutral), urgency (low/medium/high)

#### `reports`
- Generated business insights
- Fields: id, business_id (FK), content (markdown text), signal_count, generated_at
- Security: RLS restricts to user's own business reports
- Indexes: business_id + generated_at (fetch latest report)

#### `integration_runs`
- Tracks cursor state for polling integrations (Shopify, Google, etc.)
- Fields: id, business_id, source, status, last_cursor, last_success_at, error_message, created_at, updated_at
- Used for cron job state management
- Unique constraint: (business_id, source) — one run per source per business

---

## API Endpoints

### Core Endpoints

#### `POST /api/ingest`
**Purpose**: Ingest a single authenticated signal  
**Auth**: Required (Supabase session)  
**Payload**:
```json
{
  "source": "customer-email",
  "type": "feedback",
  "raw_text": "Your product is great but delivery took 3 weeks",
  "metadata": { "email_id": "abc123" }
}
```
**Response**: Tagged signal with sentiment, topics, urgency  
**Flow**: Stores signal → Calls Groq to tag → Returns result

#### `POST /api/seed`
**Purpose**: Load demo signals into current user's business  
**Auth**: Required (Supabase session)  
**Payload**: `{}`  
**Response**: Loaded signals array  
**Use**: Quick testing — creates ~10 sample signals across different sources

#### `POST /api/report/generate`
**Purpose**: Generate and save a new insight report  
**Auth**: Required (Supabase session)  
**Payload**: `{}`  
**Response**: Generated report object with content, signal_count, generated_at  
**Flow**: Fetches all signals → Calls Groq to generate report → Stores in DB

#### `GET /api/cron/report`
**Purpose**: Batch report generation (cron placeholder)  
**Auth**: CRON_SECRET header validation  
**Payload**: None  
**Response**: Generated reports  
**Status**: Placeholder for automated scheduled report generation

#### `GET /api/cron/collect/shopify`
**Purpose**: Poll Shopify store for new orders/products (cron placeholder)  
**Auth**: CRON_SECRET header validation  
**Status**: Placeholder; requires Shopify OAuth token in business record

#### `GET /api/cron/collect/reviews`
**Purpose**: Poll Google Business Profile for reviews (cron placeholder)  
**Auth**: CRON_SECRET header validation  
**Status**: Placeholder; requires Google OAuth token in business record

---

## AI/LLM Integration

### Groq Llama 3.3 70B
- **Model**: `llama-3.3-70b-versatile`
- **Use Case 1 - Signal Tagging**: Analyzes raw text → returns JSON with sentiment, topics, urgency
  - Temperature: 0.1 (low randomness for consistent tagging)
  - Max tokens: 180
  - Format: Strict JSON parsing with fallback
  
- **Use Case 2 - Report Generation**: Generates executive summary + action list
  - Temperature: 0.7 (higher for narrative fluency)
  - Max tokens: 2000+
  - Format: Markdown-formatted report

### Embeddings (Prepared, Not Active)
- **Model**: `llama3-text-embed-v2` (384-dimensional vectors)
- **Purpose**: Prepared for RAG/semantic search use cases
- **Status**: Implemented (`lib/embeddings.ts`) but not integrated into dashboard

### Fallback System
- If Groq API unavailable or `GROQ_API_KEY` not set:
  - **Tagging**: Returns neutral sentiment, generic topics, low urgency
  - **Reports**: Generates deterministic report from signal statistics (counts, aggregations)
- Deterministic fallback is feature-complete and allows testing without API keys

---

## User Flow (MVP)

### Onboarding
1. Visit `/auth/signup`
2. Enter email, password, business name
3. Auto-created business workspace and account
4. Redirected to dashboard

### Testing (Demo Mode)
1. Click **"Load demo data"** on dashboard
2. ~10 sample signals are ingested and tagged
3. Dashboard populates with demo metrics

### Generating Report
1. Click **"Generate report"**
2. App fetches all signals
3. Groq (or fallback) generates executive summary
4. Report displayed on dashboard
5. Report saved to database with timestamp

### Viewing Signals
1. Dashboard shows **"Signals"** feed with pagination
2. Signals display: source, text, sentiment badge, urgency, topics
3. Signals sorted by collected_at (newest first)

---

## File Structure

```
├── app/
│   ├── api/
│   │   ├── ingest/route.ts              # Signal ingestion endpoint
│   │   ├── seed/route.ts                # Demo data loader
│   │   ├── report/generate/route.ts     # Report generation
│   │   ├── cron/
│   │   │   ├── report/route.ts          # Cron: batch reports
│   │   │   ├── collect/shopify/route.ts # Cron: Shopify polling
│   │   │   └── collect/reviews/route.ts # Cron: Review polling
│   ├── auth/
│   │   ├── login/page.tsx               # Login page
│   │   └── signup/page.tsx              # Signup page
│   ├── dashboard/page.tsx               # Main dashboard
│   └── layout.tsx, page.tsx, globals.css
├── components/
│   ├── AuthForm.tsx                     # Reusable auth form component
│   └── DashboardClient.tsx              # Client-side dashboard component
├── lib/
│   ├── auth.ts                          # getAuthedBusiness() helper
│   ├── groq.ts                          # tagSignal(), fallbackReport()
│   ├── embeddings.ts                    # getEmbedding() for Groq embeddings
│   ├── pinecone.ts                      # Pinecone client setup
│   ├── types.ts                         # TypeScript interfaces
│   ├── env.ts                           # Environment variable validation
│   ├── demo.ts                          # Demo signal data
│   └── supabase/
│       ├── client.ts                    # Supabase client (browser)
│       └── server.ts                    # Supabase client (server)
├── supabase/
│   └── schema.sql                       # Full database schema + RLS policies
├── scripts/
│   └── pinecone_test.ts                 # Pinecone setup/test script
├── middleware.ts                        # Next.js middleware for auth
├── next.config.mjs, tsconfig.json, tailwind.config.ts
├── package.json                         # Dependencies & scripts
├── vercel.json                          # Vercel deployment config
└── README.md, prd.md (this file)
```

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=          # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Supabase anonymous/public key

# Groq API (optional for demo/fallback)
GROQ_API_KEY=                      # Free tier API key from groq.com

# Cron Authentication
CRON_SECRET=                       # Shared secret for cron endpoint verification
```

---

## Current Status & MVP Scope

### ✅ Completed
- Email/password authentication with Supabase
- Business workspace creation and isolation (RLS)
- Manual signal ingestion API with real-time AI tagging
- Demo data loader for instant testing
- Report generation with Groq or deterministic fallback
- Dashboard with metrics, themes, and signal feed
- Database schema with proper security policies
- Fallback system (complete feature parity without Groq API)

### 🔄 Planned (Post-MVP)
- **Shopify OAuth**: Hourly polling of orders, products, cart abandonment
- **Google Business Profile**: Daily review ingestion and tagging
- **Facebook/Instagram**: Comment and rating polling
- **GA4**: Daily page view/session/funnel summaries
- **Email delivery**: Integration with Resend for report emails
- **Slack/WhatsApp alerts**: Critical signal notifications
- **Vector search**: Semantic search on Pinecone (infrastructure ready)
- **Advanced filtering**: Custom date ranges, multi-source filters
- **Team collaboration**: Multi-user workspaces with role-based access

---

## Performance Considerations

### Latency
- **Signal tagging**: ~0.5s (Groq latency) + DB write
- **Report generation**: ~5-10s (Groq latency depends on signal count) + DB write
- **Dashboard load**: <1s (single business query with RLS)

### Scalability
- Database indexes on frequent query patterns (business_id, collected_at, source, urgency)
- RLS policies prevent N+1 queries (all access scoped to single business)
- Groq free tier: Up to 30 requests/minute (sufficient for MVP)
- Signals table will grow over time; consider archiving old signals (>1 year) in production

### Cost (MVP)
- Supabase: Free tier (512MB database, realtime included)
- Groq: Free tier (up to 30 req/min)
- Pinecone: Free tier (1 index, limited storage)
- Vercel: Free tier (12 serverless functions, 1000 compute hours)
- Total: ~$0 for MVP; scales with traffic

---

## Testing Strategy

### Manual Testing
1. **Auth flow**: Sign up → Login → Logout
2. **Demo mode**: Load demo data → Generate report → Verify dashboard
3. **Signal ingestion**: POST to `/api/ingest` with curl/Postman → Verify AI tagging
4. **Fallback mode**: Unset `GROQ_API_KEY` → Test report generation without API
5. **RLS security**: Create 2 accounts → Verify signals are isolated per business

### Automated Testing (Future)
- Unit tests for `groq.ts` (tagging logic)
- Integration tests for API endpoints
- E2E tests for auth flow and dashboard

---

## Deployment

### Local Development
```bash
npm install
cp .env.example .env.local
# Add environment variables
npm run dev
```

### Production (Vercel)
- Connect GitHub repo to Vercel
- Add environment variables in Vercel dashboard
- Deploy: `git push` to trigger auto-deploy
- Database: Supabase Postgres (separate from Vercel)

---

## Security Considerations

### Authentication
- Email/password with Supabase Auth (industry standard)
- Session tokens stored in HTTP-only cookies (SSR + client)
- Middleware enforces auth on protected routes

### Data Isolation
- Row-Level Security (RLS) on all tables
- Policies restrict access to user's own business and signals
- No cross-business data leakage possible at database layer

### API Security
- Cron endpoints require `CRON_SECRET` header
- Groq API key never exposed to client
- No sensitive data in logs or error messages

### Future Hardening
- Rate limiting on signal ingestion
- CSRF tokens for form submissions
- Input validation on all endpoints
- Audit logging for compliance

---

## Next Steps & Roadmap

### Phase 1 (Current)
- MVP validation with early users
- Shopify integration (OAuth + order/product polling)
- Basic metrics dashboard

### Phase 2
- Google Business Profile integration
- Social media integrations (Facebook, Instagram)
- Email report delivery
- Advanced filtering and export

### Phase 3
- AI-powered insights (predictive churn, opportunity scoring)
- Team collaboration features
- Custom report templates
- API for third-party integrations

### Phase 4+
- Mobile app
- Real-time alerts (Slack/WhatsApp)
- Advanced analytics and forecasting
- Multi-brand support

---

## Key Contacts & References

**Repository**: KnowledgeLoop MVP  
**Tech Lead**: Single developer  
**Status**: Active development  

**Key Dependencies**:
- Supabase: https://supabase.com
- Groq API: https://groq.com
- Next.js: https://nextjs.org
- Tailwind CSS: https://tailwindcss.com

**Notes**:
- This is an MVP. Core features are working; integrations are placeholders.
- Deterministic fallback ensures feature parity without paid APIs.
- Designed for early users in e-commerce vertical; expandable to SaaS, B2B, etc.
