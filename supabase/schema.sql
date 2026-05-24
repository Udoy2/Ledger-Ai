create extension if not exists pgcrypto;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  industry text not null default 'e-commerce',
  brand_voice text not null default 'direct, warm, and evidence-backed',
  shopify_domain text,
  shopify_token text,
  woo_domain text,
  woo_token text,
  google_token jsonb,
  facebook_token text,
  instagram_token text,
  ga4_property_id text,
  created_at timestamptz not null default now(),
  unique(owner_id)
);

create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  source text not null,
  type text not null,
  raw_text text not null,
  sentiment text not null default 'neutral' check (sentiment in ('positive', 'negative', 'neutral')),
  topics text[] not null default '{}',
  urgency text not null default 'low' check (urgency in ('low', 'medium', 'high')),
  metadata jsonb not null default '{}',
  collected_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  content text not null,
  signal_count integer not null default 0,
  generated_at timestamptz not null default now()
);

create table if not exists public.integration_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  source text not null,
  status text not null default 'pending',
  last_cursor text,
  last_success_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(business_id, source)
);

create table if not exists public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  trigger_source text not null default 'manual',
  status text not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  input_summary jsonb not null default '{}',
  output_summary jsonb not null default '{}',
  error_message text
);

create table if not exists public.tool_calls (
  id uuid primary key default gen_random_uuid(),
  ai_run_id uuid not null references public.ai_runs(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  step text not null,
  tool_name text not null,
  status text not null default 'success',
  input jsonb not null default '{}',
  output jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  ai_run_id uuid references public.ai_runs(id) on delete set null,
  title text not null,
  rationale text not null,
  impact text not null default 'medium',
  effort text not null default 'medium',
  confidence numeric(4, 3) not null default 0.5,
  status text not null default 'open',
  evidence_signal_ids text[] not null default '{}',
  evidence_note text,
  metric_to_watch text,
  next_step text,
  created_at timestamptz not null default now()
);

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  ai_run_id uuid references public.ai_runs(id) on delete set null,
  kind text not null default 'fact',
  key text not null,
  value text not null,
  confidence numeric(4, 3) not null default 0.6,
  source text not null default 'agent',
  created_at timestamptz not null default now(),
  unique(business_id, key)
);

create table if not exists public.entities (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  kind text not null,
  name text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (business_id, kind, name)
);

create table if not exists public.relationships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  from_entity_id uuid not null references public.entities(id) on delete cascade,
  to_entity_id uuid not null references public.entities(id) on delete cascade,
  relation text not null,
  weight numeric(4, 3) not null default 0.5,
  evidence jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_businesses_owner_id on public.businesses(owner_id);
create index if not exists idx_signals_business_collected on public.signals(business_id, collected_at desc);
create index if not exists idx_signals_business_source on public.signals(business_id, source);
create index if not exists idx_signals_business_urgency on public.signals(business_id, urgency);
create index if not exists idx_reports_business_generated on public.reports(business_id, generated_at desc);
create index if not exists idx_ai_runs_business_started on public.ai_runs(business_id, started_at desc);
create index if not exists idx_tool_calls_run_created on public.tool_calls(ai_run_id, created_at asc);
create index if not exists idx_recommendations_business_created on public.recommendations(business_id, created_at desc);
create index if not exists idx_memories_business_created on public.memories(business_id, created_at desc);
create index if not exists idx_entities_business_kind on public.entities(business_id, kind);
create index if not exists idx_relationships_business on public.relationships(business_id);

create or replace function public.handle_new_user_business()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.businesses (owner_id, name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'business_name', ''), 'My Business')
  )
  on conflict (owner_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_business on auth.users;
create trigger on_auth_user_created_create_business
after insert on auth.users
for each row execute function public.handle_new_user_business();

revoke execute on function public.handle_new_user_business() from public;
revoke execute on function public.handle_new_user_business() from anon;
revoke execute on function public.handle_new_user_business() from authenticated;

alter table public.businesses enable row level security;
alter table public.signals enable row level security;
alter table public.reports enable row level security;
alter table public.integration_runs enable row level security;
alter table public.ai_runs enable row level security;
alter table public.tool_calls enable row level security;
alter table public.recommendations enable row level security;
alter table public.memories enable row level security;
alter table public.entities enable row level security;
alter table public.relationships enable row level security;

drop policy if exists "owners can read own business" on public.businesses;
create policy "owners can read own business"
on public.businesses for select
using ((select auth.uid()) = owner_id);

drop policy if exists "owners can insert own business" on public.businesses;
create policy "owners can insert own business"
on public.businesses for insert
with check ((select auth.uid()) = owner_id);

drop policy if exists "owners can update own business" on public.businesses;
create policy "owners can update own business"
on public.businesses for update
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "owners can manage own signals" on public.signals;
create policy "owners can manage own signals"
on public.signals for all
using (business_id in (select id from public.businesses where owner_id = (select auth.uid())))
with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));

drop policy if exists "owners can manage own reports" on public.reports;
create policy "owners can manage own reports"
on public.reports for all
using (business_id in (select id from public.businesses where owner_id = (select auth.uid())))
with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));

drop policy if exists "owners can manage own integration runs" on public.integration_runs;
create policy "owners can manage own integration runs"
on public.integration_runs for all
using (business_id in (select id from public.businesses where owner_id = (select auth.uid())))
with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));

drop policy if exists "owners can manage own ai runs" on public.ai_runs;
create policy "owners can manage own ai runs"
on public.ai_runs for all
using (business_id in (select id from public.businesses where owner_id = (select auth.uid())))
with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));

drop policy if exists "owners can manage own tool calls" on public.tool_calls;
create policy "owners can manage own tool calls"
on public.tool_calls for all
using (business_id in (select id from public.businesses where owner_id = (select auth.uid())))
with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));

drop policy if exists "owners can manage own recommendations" on public.recommendations;
create policy "owners can manage own recommendations"
on public.recommendations for all
using (business_id in (select id from public.businesses where owner_id = (select auth.uid())))
with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));

drop policy if exists "owners can manage own memories" on public.memories;
create policy "owners can manage own memories"
on public.memories for all
using (business_id in (select id from public.businesses where owner_id = (select auth.uid())))
with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));

drop policy if exists "owners can manage own entities" on public.entities;
create policy "owners can manage own entities"
on public.entities for all
using (business_id in (select id from public.businesses where owner_id = (select auth.uid())))
with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));

drop policy if exists "owners can manage own relationships" on public.relationships;
create policy "owners can manage own relationships"
on public.relationships for all
using (business_id in (select id from public.businesses where owner_id = (select auth.uid())))
with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
