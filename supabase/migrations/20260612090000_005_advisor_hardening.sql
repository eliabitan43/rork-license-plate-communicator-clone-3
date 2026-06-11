-- HOMI Migration 005 — security-advisor hardening
-- Findings from supabase advisors after initial provisioning.

-- Pin search_path on all our functions (mutable search_path lint).
alter function public.normalize_plate(text) set search_path = public;
alter function public.vehicles_normalize_plate() set search_path = public;
alter function public.messages_normalize_plate() set search_path = public;
alter function public.set_event_expiry() set search_path = public;
alter function public.nearby_events(text[], double precision, double precision, double precision)
  set search_path = public;

-- Trigger-only SECURITY DEFINER functions must not be client-callable via
-- PostgREST RPC. Triggers fire regardless of the caller's EXECUTE privilege.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.broadcast_event() from public, anon, authenticated;

-- PostGIS reference table: extension-owned, can't take RLS. It holds no user
-- data; removing client grants silences the PostgREST exposure.
do $$
begin
  revoke all on table public.spatial_ref_sys from anon, authenticated;
exception when insufficient_privilege then
  raise notice 'spatial_ref_sys grants unchanged (not owner) — reference data only, no user data';
end;
$$;
