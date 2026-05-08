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

create index if not exists idx_businesses_owner_id on public.businesses(owner_id);
create index if not exists idx_signals_business_collected on public.signals(business_id, collected_at desc);
create index if not exists idx_signals_business_source on public.signals(business_id, source);
create index if not exists idx_signals_business_urgency on public.signals(business_id, urgency);
create index if not exists idx_reports_business_generated on public.reports(business_id, generated_at desc);

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
