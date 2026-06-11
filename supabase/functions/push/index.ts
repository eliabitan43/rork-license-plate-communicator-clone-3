// push — standalone Expo push dispatcher.
//
// Invoke with the service role key (server-to-server only):
//   POST { userId?, tokens?, title, body, data?, highPriority? }
// Either `userId` (tokens looked up in public.devices) or explicit `tokens`.
// highPriority -> priority 'high' + channelId 'critical-alerts', else 'messages'.
// Deep-link payload convention: data: { messageId, threadPlate, ... }.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sendExpoPush } from '../_shared/expoPush.ts';

interface PushRequest {
  userId?: string;
  tokens?: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  highPriority?: boolean;
}

Deno.serve(async (req) => {
  try {
    // Service-role-only endpoint: reject anon/authenticated callers.
    const authHeader = req.headers.get('Authorization') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (!authHeader.endsWith(serviceKey)) {
      return Response.json({ error: 'forbidden' }, { status: 403 });
    }

    const body = (await req.json()) as PushRequest;
    if (!body.title || !body.body) {
      return Response.json({ error: 'title and body are required' }, { status: 400 });
    }

    let tokens = body.tokens ?? [];
    if (tokens.length === 0 && body.userId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        serviceKey,
        { auth: { persistSession: false } },
      );
      const { data: devices, error } = await supabase
        .from('devices')
        .select('expo_push_token')
        .eq('user_id', body.userId);
      if (error) throw error;
      tokens = (devices ?? []).map((d) => d.expo_push_token);
    }

    if (tokens.length === 0) {
      return Response.json({ sent: 0, reason: 'no_tokens' }, { status: 200 });
    }

    const tickets = await sendExpoPush(
      tokens.map((to) => ({
        to,
        title: body.title,
        body: body.body,
        data: body.data,
        priority: body.highPriority ? 'high' : 'normal',
        channelId: body.highPriority ? 'critical-alerts' : 'messages',
        sound: 'default',
      })),
    );

    return Response.json(
      { sent: tickets.filter((t) => t.status === 'ok').length, tickets },
      { status: 200 },
    );
  } catch (error) {
    console.error('push failed:', error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
});
