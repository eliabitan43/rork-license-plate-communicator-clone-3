// send-message — delivery orchestrator.
//
// Trigger: Database Webhook on INSERT into public.messages.
// Resolution order:
//   1. recipient has a push token            -> Expo push  (delivery_state: push_sent)
//   2. recipient has a verified phone        -> Twilio SMS with homi.app/m/[token] link (sms_sent)
//   3. otherwise (incl. unclaimed plates)    -> hold in-app (in_app)
//
// highPriority messages skip any batching and dispatch immediately with
// priority 'high' on the 'critical-alerts' channel. (Nothing here batches —
// the flag is honored by never deferring and by channel/priority selection.)
//
// Per-sender rate limit: max 10 sends per rolling hour, checked before dispatch.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sendExpoPush } from '../_shared/expoPush.ts';

const RATE_LIMIT_PER_HOUR = 10;
const SITE_URL = Deno.env.get('PUBLIC_SITE_URL') ?? 'https://homi.app';

interface MessageRecord {
  id: string;
  from_user_id: string | null;
  to_user_id: string | null;
  to_plate_normalized: string;
  to_country_code: string;
  category: string;
  action_id: string | null;
  body: string;
  is_anonymous: boolean;
  high_priority: boolean;
  delivery_state: string;
  created_at: string;
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: MessageRecord;
}

function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
}

async function sendTwilioSms(to: string, body: string): Promise<void> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!sid || !token || !from) {
    throw new Error('Twilio secrets not configured');
  }

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio ${res.status}: ${text}`);
  }
}

Deno.serve(async (req) => {
  try {
    // Webhook authentication: the Database Webhook must send
    // `x-webhook-secret: $WEBHOOK_SECRET` (configured as an HTTP header on the
    // webhook). Defense in depth on top of platform JWT verification — and the
    // only auth when the function is deployed with verify_jwt disabled.
    const expectedSecret = Deno.env.get('WEBHOOK_SECRET');
    if (expectedSecret && req.headers.get('x-webhook-secret') !== expectedSecret) {
      return Response.json({ error: 'forbidden' }, { status: 403 });
    }

    const payload = (await req.json()) as WebhookPayload;
    if (payload.type !== 'INSERT' || payload.table !== 'messages') {
      return Response.json({ skipped: true }, { status: 200 });
    }

    const msg = payload.record;
    const supabase = serviceClient();

    // ── Rate limit: max 10 sends per sender per rolling hour ──────────────────
    if (msg.from_user_id) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count, error: countError } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('from_user_id', msg.from_user_id)
        .gte('created_at', oneHourAgo);

      if (countError) throw countError;
      if ((count ?? 0) > RATE_LIMIT_PER_HOUR) {
        await supabase
          .from('messages')
          .update({ delivery_state: 'failed' })
          .eq('id', msg.id);
        console.warn(`Rate limit: sender ${msg.from_user_id} exceeded ${RATE_LIMIT_PER_HOUR}/h`);
        return Response.json({ delivery: 'rate_limited' }, { status: 200 });
      }
    }

    // ── Resolve plate -> owner (service role only; never exposed to clients) ──
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('owner_id')
      .eq('country_code', msg.to_country_code)
      .eq('plate_normalized', msg.to_plate_normalized)
      .maybeSingle();

    if (!vehicle) {
      // Unclaimed plate: hold in-app. The web token loop kicks in when the
      // plate is claimed (or when a future plate->phone source exists).
      await supabase
        .from('messages')
        .update({ delivery_state: 'in_app' })
        .eq('id', msg.id);
      return Response.json({ delivery: 'in_app', reason: 'unclaimed_plate' }, { status: 200 });
    }

    await supabase
      .from('messages')
      .update({ to_user_id: vehicle.owner_id })
      .eq('id', msg.id);

    // ── 1) Push ────────────────────────────────────────────────────────────────
    const { data: devices } = await supabase
      .from('devices')
      .select('expo_push_token')
      .eq('user_id', vehicle.owner_id);

    if (devices && devices.length > 0) {
      const tickets = await sendExpoPush(
        devices.map((d) => ({
          to: d.expo_push_token,
          title: msg.high_priority ? '🚨 Urgent message about your car' : 'New message about your car',
          body: msg.body.slice(0, 160),
          data: { messageId: msg.id, threadPlate: msg.to_plate_normalized },
          priority: msg.high_priority ? 'high' : 'normal',
          channelId: msg.high_priority ? 'critical-alerts' : 'messages',
          sound: 'default',
        })),
      );

      const delivered = tickets.some((t) => t.status === 'ok');
      if (delivered) {
        await supabase
          .from('messages')
          .update({ delivery_state: 'push_sent' })
          .eq('id', msg.id);
        return Response.json({ delivery: 'push' }, { status: 200 });
      }
      console.warn('All push tickets failed, falling through to SMS', tickets);
    }

    // ── 2) SMS with tokenized landing link ────────────────────────────────────
    const { data: owner } = await supabase
      .from('users')
      .select('phone, phone_verified')
      .eq('id', vehicle.owner_id)
      .single();

    if (owner?.phone && owner.phone_verified) {
      const { data: tokenRow, error: tokenError } = await supabase
        .from('message_tokens')
        .insert({ message_id: msg.id, referral_source: 'sms' })
        .select('token')
        .single();
      if (tokenError) throw tokenError;

      const smsBody = msg.high_priority
        ? `HOMI urgent alert: someone left a message about your car (${msg.to_plate_normalized}). Read it now: ${SITE_URL}/m/${tokenRow.token}`
        : `Someone left you a message about your car on HOMI. Read it: ${SITE_URL}/m/${tokenRow.token}`;

      await sendTwilioSms(owner.phone, smsBody);

      await supabase
        .from('messages')
        .update({ delivery_state: 'sms_sent' })
        .eq('id', msg.id);
      return Response.json({ delivery: 'sms' }, { status: 200 });
    }

    // ── 3) Hold in-app ─────────────────────────────────────────────────────────
    await supabase
      .from('messages')
      .update({ delivery_state: 'in_app' })
      .eq('id', msg.id);
    return Response.json({ delivery: 'in_app' }, { status: 200 });
  } catch (error) {
    console.error('send-message failed:', error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
});
