# HOMI Edge Functions

Two functions own message delivery. `send-message` is the orchestrator; `push` is a
standalone dispatcher for other server-side senders.

## Wiring

1. Apply migrations: `supabase db push`
2. Deploy: `supabase functions deploy send-message push`
3. Create a **Database Webhook** (Dashboard → Database → Webhooks):
   - Table: `public.messages`, events: `INSERT`
   - Type: Supabase Edge Function → `send-message`
   - Timeout: 5000ms

## Required secrets

Set with `supabase secrets set KEY=value`:

| Secret | Used by | Notes |
|---|---|---|
| `TWILIO_ACCOUNT_SID` | send-message | Twilio console → Account Info |
| `TWILIO_AUTH_TOKEN` | send-message | Rotate if ever exposed |
| `TWILIO_PHONE_NUMBER` | send-message | E.164, must be SMS-capable for Israel |
| `EXPO_ACCESS_TOKEN` | both | expo.dev → Access Tokens (enhanced push security) |
| `PUBLIC_SITE_URL` | send-message | Defaults to `https://homi.app` |

`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

## Delivery contract

- Resolution order: push token → Twilio SMS (`/m/[token]` link, 72h expiry) → `in_app` hold.
- `high_priority` messages are never batched or deferred; pushes go out with
  `priority: high` on the `critical-alerts` Android channel.
- Per-sender rate limit: 10 sends per rolling hour → `delivery_state: failed`.
- Plate → owner resolution happens **only** here (service role). No client path may
  return who owns a plate.

## Twilio console checklist (do before first real send)

- [ ] **SMS Pumping Protection: ON** (Messaging → Settings → SMS Pumping Protection)
- [ ] **Geo Permissions: Israel only** (Messaging → Settings → Geo Permissions —
      disable every other destination country)
- [ ] **Usage trigger at $20/day** (Monitor → Usage Triggers → alert + webhook)
- [ ] Verify the sender number is approved for IL traffic
- [ ] Test with Twilio test credentials before switching to live keys

## Smoke test

```sql
-- 1. Seed a recipient with a verified phone + claimed plate (service role / SQL editor):
--    users.phone, users.phone_verified=true, vehicles row for the plate.
-- 2. Insert a message as an authenticated user from the app (or via SQL with from_user_id).
-- 3. Watch: supabase functions logs send-message --follow
-- 4. Expect: Twilio API 201, message_tokens row created, delivery_state='sms_sent',
--    and https://homi.app/m/<token> renders the blurred message.
```
