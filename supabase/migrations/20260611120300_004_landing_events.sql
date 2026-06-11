-- HOMI Migration 004 — landing page analytics (web /api/t endpoint)

create table public.landing_events (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  token text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index landing_events_event_idx on public.landing_events (event, created_at desc);
create index landing_events_token_idx on public.landing_events (token);

-- Service-role only: RLS on, zero policies.
alter table public.landing_events enable row level security;
