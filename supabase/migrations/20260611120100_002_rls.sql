-- HOMI Migration 002 — Row Level Security
--
-- HARD PRIVACY REQUIREMENT: plate → owner resolution must never be possible
-- from the client. Vehicles are readable by their owner ONLY; the send-message
-- Edge Function (service role, bypasses RLS) is the sole resolution path.

-- ── Enable RLS on every table ─────────────────────────────────────────────────
alter table public.users enable row level security;
alter table public.vehicles enable row level security;
alter table public.messages enable row level security;
alter table public.message_tokens enable row level security;
alter table public.devices enable row level security;
alter table public.events enable row level security;
alter table public.referrals enable row level security;

-- ── users ─────────────────────────────────────────────────────────────────────
create policy users_select_own on public.users
  for select to authenticated
  using (id = (select auth.uid()));

create policy users_update_own on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ── vehicles — owner-only, no exceptions ──────────────────────────────────────
create policy vehicles_select_own on public.vehicles
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy vehicles_insert_own on public.vehicles
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy vehicles_update_own on public.vehicles
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy vehicles_delete_own on public.vehicles
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ── messages — participants only ──────────────────────────────────────────────
create policy messages_select_participant on public.messages
  for select to authenticated
  using (
    from_user_id = (select auth.uid())
    or to_user_id = (select auth.uid())
  );

-- Clients insert as themselves and may NOT pre-resolve the recipient:
-- to_user_id must be null at insert time (the Edge Function fills it in).
create policy messages_insert_own on public.messages
  for insert to authenticated
  with check (
    from_user_id = (select auth.uid())
    and to_user_id is null
  );

-- Recipients may mark their messages read.
create policy messages_update_recipient on public.messages
  for update to authenticated
  using (to_user_id = (select auth.uid()))
  with check (to_user_id = (select auth.uid()));

-- ── message_tokens — service-role only ────────────────────────────────────────
-- No policies: with RLS enabled and zero policies, authenticated/anon clients
-- get nothing. The web token page reads via the service-role client.

-- ── devices — own rows only ───────────────────────────────────────────────────
create policy devices_select_own on public.devices
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy devices_insert_own on public.devices
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy devices_update_own on public.devices
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy devices_delete_own on public.devices
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ── events — authenticated read + own insert ──────────────────────────────────
create policy events_select_authenticated on public.events
  for select to authenticated
  using (true);

create policy events_insert_own on public.events
  for insert to authenticated
  with check (reporter_id = (select auth.uid()));

-- ── referrals ─────────────────────────────────────────────────────────────────
create policy referrals_select_own on public.referrals
  for select to authenticated
  using (
    referrer_id = (select auth.uid())
    or redeemed_by = (select auth.uid())
  );

create policy referrals_insert_own on public.referrals
  for insert to authenticated
  with check (referrer_id = (select auth.uid()));

-- RESTRICTIVE: anonymous (ghost) users assume the `authenticated` role in
-- Supabase, so explicitly block them from creating referral codes — referral
-- rewards require a registered identity.
create policy referrals_block_anonymous on public.referrals
  as restrictive
  for insert to authenticated
  with check (
    coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  );

-- ── Self-audit: fail the migration if any public table is missing RLS ─────────
do $$
declare
  unprotected text;
begin
  select string_agg(c.relname, ', ')
  into unprotected
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and not c.relrowsecurity
    -- Extension-owned tables (e.g. postgis spatial_ref_sys) can't take RLS
    -- and hold no user data.
    and not exists (
      select 1 from pg_depend d
      where d.objid = c.oid and d.deptype = 'e'
    );

  if unprotected is not null then
    raise exception 'RLS disabled on public tables: %', unprotected;
  end if;
end;
$$;
