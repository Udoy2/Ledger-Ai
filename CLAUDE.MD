# CLAUDE.MD

Compact working memory for agents. Read this first, then inspect only the files needed for the current task.

## Project Snapshot

- Product: LedgerAI MVP, an AI insight dashboard for ecommerce owners.
- Core loop: auth -> workspace -> collect signals -> AI tags/topics/urgency -> report/RAG chat/dashboard.
- Stack: Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Supabase Auth/Postgres/RLS, Groq, Pinecone, Google APIs.
- Demo mode: app can render deterministic demo data when Supabase env vars are missing.

## High-Signal Files

- `README.md`: setup, user flow, API endpoint list.
- `prd.md`, `project_review.md`, `docs/`: product and judging context.
- `app/dashboard/page.tsx`: main server dashboard, auth gate, Supabase reads, demo fallback. (Note: search bar has been removed)
- `components/DashboardClient.tsx`: dashboard actions for seed/report/connect/sync/AI CFO.
- `components/FaqSetupPanel.tsx`, `components/LazyDashboardWidgets.tsx`, `components/ThemeToggle.tsx`: lazy widgets and UI.
- `components/RagChat.tsx`, `lib/rag.ts`, `lib/hybrid-rag.ts`: chat and retrieval logic.
- `app/api/**/route.ts`: all backend API routes and cron/connectors.
- `lib/providers/clarity.ts`: Microsoft Clarity API provider.
- `lib/supabase/server.ts`: SSR Supabase client with cookie handling.
- `lib/supabase/admin.ts`: service-role Supabase client; only use in server/API code.
- `lib/env.ts`: `hasSupabaseEnv()` controls live backend vs demo behavior.
- `lib/ai.ts`, `lib/groq.ts`, `lib/ai-config.ts`: AI report/tagging provider logic.
- `lib/index-signal.ts`, `lib/embeddings.ts`, `lib/pinecone.ts`: vector indexing.
- `supabase/schema.sql`: database schema and RLS source of truth.
- `docs/LedgerAI_Hackathon_Pitch.md`: hackathon pitch deck.
- `Dockerfile`, `docker-compose.yml`: Docker deployment files.

## Commands

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
```

Use `npm run typecheck` for fast TypeScript verification. Use `npm run build` when touching Next server/client boundaries, API routes, or env-dependent behavior.

## Environment

Expected local env file: `.env.local`.

Required for live Supabase:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

AI/integration keys:

```text
GROQ_API_KEY=
PINECONE_API_KEY=
PINECONE_INDEX=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
CRON_SECRET=
```

`GROQ_API_KEY` is optional for demo-style report generation; fallback output exists.

## Implementation Conventions

- Prefer existing App Router patterns: server components fetch data; client components handle button clicks/forms.
- Keep service-role Supabase calls inside API routes or server-only helpers.
- Preserve business scoping on all Supabase reads/writes (`business_id`) and avoid bypassing RLS casually.
- When adding data fields, update `supabase/schema.sql`, relevant `lib/types.ts` types, API route selects/inserts, and UI consumers together.
- Keep demo fallback working unless the task explicitly removes it.
- Use `lucide-react` icons for UI controls.
- Follow existing CSS variables/classes in `app/globals.css` and Tailwind config instead of inventing a separate theme.
- Do not commit secrets or print `.env.local` values.

## Token-Saving Workflow

- Start with this file plus the exact target file.
- Use `rg` for discovery, especially route names, table names, and type names.
- Read `README.md` only when setup/API context is needed.
- Read `supabase/schema.sql` before changing DB queries, RLS, auth, or report persistence.
- Avoid opening large product docs unless the request is product/pitch/judge-facing.
