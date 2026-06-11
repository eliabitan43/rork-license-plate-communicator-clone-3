import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * True when EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are set.
 * The app is offline-first: every Supabase touchpoint must check this and
 * degrade to local-only behavior when false (pre-provisioning builds, CI).
 */
export const isSupabaseConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: Platform.OS === 'web' ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

/** Normalize a plate exactly like public.normalize_plate() in Postgres. */
export function normalizePlate(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/** Current auth user id, or null when signed out / unconfigured. */
export async function getAuthUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Register (or refresh) this device's Expo push token so the send-message
 * Edge Function can route pushes. No-op when unconfigured or signed out.
 */
export async function registerDeviceToken(
  expoPushToken: string,
  platform: 'ios' | 'android' | 'web',
): Promise<void> {
  if (!supabase || !expoPushToken) return;
  const userId = await getAuthUserId();
  if (!userId) return;

  const { error } = await supabase.from('devices').upsert(
    {
      user_id: userId,
      expo_push_token: expoPushToken,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'expo_push_token' },
  );
  if (error) console.warn('Device token registration failed:', error.message);
}
