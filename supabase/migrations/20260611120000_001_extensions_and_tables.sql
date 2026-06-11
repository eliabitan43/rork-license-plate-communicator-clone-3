-- HOMI Migration 001 — extensions, core tables, plate normalization, event expiry
-- Applied via `supabase db push` / `supabase migration up`. Never paste into the dashboard.

-- ── Extensions ────────────────────────────────────────────────────────────────
create extension if not exists postgis;
create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists "uuid-ossp";

-- ── Helpers ───────────────────────────────────────────────────────────────────

-- Canonical plate form: strip everything but [A-Z0-9], uppercase.
-- Must match the client's normalizePlate() exactly.
create or replace function public.normalize_plate(raw text)
returns text
language sql
immutable
strict
as $$
  select upper(regexp_replace(raw, '[^a-zA-Z0-9]', '', 'g'));
$$;

-- ── users ─────────────────────────────────────────────────────────────────────
-- Profile mirror of auth.users (one row per auth user, including anonymous).
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  phone text unique,
  phone_verified boolean not null default false,
  is_anonymous boolean not null default true,
  trust_score integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-provision a public.users row for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, phone, phone_verified, is_anonymous)
  values (
    new.id,
    new.phone,
    new.phone_confirmed_at is not null,
    coalesce((new.is_anonymous)::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── vehicles ──────────────────────────────────────────────────────────────────
create type public.vehicle_type as enum (
  'car', 'truck', 'van', 'motorcycle', 'moped_scooter',
  'boat', 'jet_ski', 'rv', 'trailer', 'atv', 'offroad', 'bus', 'other'
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  vehicle_type public.vehicle_type not null default 'car',
  country_code text not null default 'IL',
  plate_normalized text not null,
  display_plate text not null,
  registration_number text,
  metadata jsonb not null default '{}'::jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (country_code, plate_normalized)
);

create index vehicles_owner_idx on public.vehicles (owner_id);

-- Keep plate_normalized canonical no matter what the client sends.
create or replace function public.vehicles_normalize_plate()
returns trigger
language plpgsql
as $$
begin
  new.plate_normalized := public.normalize_plate(coalesce(new.plate_normalized, new.display_plate));
  return new;
end;
$$;

create trigger vehicles_normalize_plate_trg
  before insert or update on public.vehicles
  for each row execute function public.vehicles_normalize_plate();

-- ── messages ──────────────────────────────────────────────────────────────────
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid references public.users (id) on delete set null,
  -- Resolved server-side by the send-message Edge Function. Clients never write this.
  to_user_id uuid references public.users (id) on delete set null,
  to_plate_normalized text not null,
  to_country_code text not null default 'IL',
  category text not null default 'general',
  action_id text,
  body text not null check (char_length(body) between 1 and 480),
  is_anonymous boolean not null default true,
  high_priority boolean not null default false,
  delivery_state text not null default 'pending'
    check (delivery_state in ('pending', 'push_sent', 'sms_sent', 'in_app', 'failed', 'read')),
  created_at timestamptz not null default now()
);

create index messages_to_user_idx on public.messages (to_user_id, created_at desc);
create index messages_from_user_idx on public.messages (from_user_id, created_at desc);
create index messages_to_plate_idx on public.messages (to_plate_normalized, created_at desc);

create or replace function public.messages_normalize_plate()
returns trigger
language plpgsql
as $$
begin
  new.to_plate_normalized := public.normalize_plate(new.to_plate_normalized);
  return new;
end;
$$;

create trigger messages_normalize_plate_trg
  before insert on public.messages
  for each row execute function public.messages_normalize_plate();

-- ── message_tokens ────────────────────────────────────────────────────────────
-- Web acquisition handoff: SMS links point at https://homi.app/m/[token].
create table public.message_tokens (
  token text primary key default encode(gen_random_bytes(16), 'hex'),
  message_id uuid not null references public.messages (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '72 hours',
  claimed_at timestamptz,
  claimed_by uuid references public.users (id),
  referral_source text,
  created_at timestamptz not null default now()
);

create index message_tokens_message_idx on public.message_tokens (message_id);

-- ── devices ───────────────────────────────────────────────────────────────────
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('ios', 'android', 'web')),
  updated_at timestamptz not null default now()
);

create index devices_user_idx on public.devices (user_id);

-- ── events (Community Watch / live map) ───────────────────────────────────────
create table public.events (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.users (id) on delete set null,
  type text not null,
  location geography(point, 4326) not null,
  geohash text not null,
  origin_vehicle_type public.vehicle_type,
  details jsonb not null default '{}'::jsonb,
  confidence real not null default 0,
  reports_count integer not null default 1,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '60 minutes'
);

create index events_geohash6_idx on public.events (left(geohash, 6));
create index events_location_idx on public.events using gist (location);
create index events_expiry_idx on public.events (expires_at);

-- TTL map mirrored from expo/hooks/useEvents.ts (TYPE_EXPIRY_MINUTES).
-- Keep the two in sync when adding event types.
create or replace function public.set_event_expiry()
returns trigger
language plpgsql
as $$
declare
  ttl_minutes integer;
begin
  ttl_minutes := case new.type
    -- Traffic & road conditions
    when 'heavy_traffic' then 60
    when 'construction' then 120
    when 'pothole' then 120
    when 'flooded_street' then 120
    when 'icy_conditions' then 120
    -- Vehicle & driver situations
    when 'disabled_vehicle' then 60
    when 'vehicle_blocking' then 60
    when 'illegal_parking' then 60
    when 'abandoned_vehicle' then 120
    -- Safety & law enforcement
    when 'checkpoint' then 90
    when 'unmarked_police' then 60
    when 'emergency_vehicle' then 30
    -- Community & environment
    when 'lost_item' then 120
    when 'found_item' then 120
    when 'stray_animal' then 60
    when 'fallen_tree' then 180
    when 'downed_power_line' then 240
    when 'water_main_break' then 240
    -- Services & assistance
    when 'gas_shortage' then 120
    when 'parking_update' then 60
    when 'rest_area_closed' then 120
    when 'free_tow_nearby' then 60
    -- Community engagement
    when 'good_neighbor' then 60
    when 'suspicious_activity' then 60
    when 'help_request' then 60
    when 'break_in_attempt' then 90
    when 'vandalism' then 120
    -- Newer incident types
    when 'traffic_enforcement_new' then 15
    when 'road_hazard' then 30
    when 'road_closure_new' then 60
    when 'vehicle_on_shoulder' then 20
    -- Legacy types
    when 'police' then 60
    when 'tow_truck' then 60
    when 'trash_truck' then 25
    when 'hazard' then 120
    when 'accident' then 120
    when 'road_closure' then 120
    when 'traffic_enforcement' then 90
    when 'street_cleaning' then 180
    else 60
  end;

  new.expires_at := coalesce(new.created_at, now()) + make_interval(mins => ttl_minutes);
  new.geohash := lower(new.geohash);
  return new;
end;
$$;

create trigger events_set_expiry_trg
  before insert on public.events
  for each row execute function public.set_event_expiry();

-- ── referrals ─────────────────────────────────────────────────────────────────
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.users (id) on delete cascade,
  invite_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  redeemed_by uuid references public.users (id),
  redeemed_at timestamptz,
  reward_state text not null default 'pending'
    check (reward_state in ('pending', 'earned', 'granted')),
  created_at timestamptz not null default now()
);

create index referrals_referrer_idx on public.referrals (referrer_id);
