import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client — server only, bypasses RLS. Required because
 * message_tokens has no client policies by design.
 * Returns null when env isn't configured (preview builds) so pages can
 * degrade to the expired/unavailable state instead of crashing.
 */
export function serviceClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
