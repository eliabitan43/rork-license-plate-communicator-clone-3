-- HOMI Migration 003 — realtime broadcast topics, event expiry sweep, nearby RPC

-- ── Broadcast new events to geohash-6 topics ──────────────────────────────────
-- Clients subscribe to `geo:<geohash6>` Broadcast topics (one per ~1.2km cell,
-- plus neighbors). Broadcast scales better than Postgres Changes and never
-- leaks rows RLS would hide — we control the payload explicitly here.
create or replace function public.broadcast_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'id', new.id,
      'type', new.type,
      'lat', st_y(new.location::geometry),
      'lng', st_x(new.location::geometry),
      'geohash', new.geohash,
      'origin_vehicle_type', new.origin_vehicle_type,
      'details', new.details,
      'created_at', new.created_at,
      'expires_at', new.expires_at
    ),
    'event_created',                    -- event name
    'geo:' || left(new.geohash, 6),     -- topic
    false                               -- public topic (no row data beyond what we expose)
  );
  return new;
end;
$$;

create trigger events_broadcast_trg
  after insert on public.events
  for each row execute function public.broadcast_event();

-- ── Minutely expiry sweep ─────────────────────────────────────────────────────
select cron.schedule(
  'homi-expire-events',
  '* * * * *',
  $$ delete from public.events where expires_at < now() $$
);

-- ── nearby_events RPC ─────────────────────────────────────────────────────────
-- Initial read on map open: geohash prefix filter (index-friendly) + exact
-- ST_DWithin radius check. Security invoker: events RLS (authenticated read) applies.
create or replace function public.nearby_events(
  neighbor_prefixes text[],
  lat double precision,
  lng double precision,
  radius_m double precision default 3000
)
returns setof public.events
language sql
stable
security invoker
as $$
  select e.*
  from public.events e
  where left(e.geohash, 6) = any (neighbor_prefixes)
    and st_dwithin(
      e.location,
      st_setsrid(st_makepoint(lng, lat), 4326)::geography,
      radius_m
    )
    and e.expires_at > now()
  order by e.created_at desc
  limit 200;
$$;

grant execute on function public.nearby_events(text[], double precision, double precision, double precision)
  to authenticated;
