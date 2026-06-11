# Changelog — feat/homi-v2

HOMI v2: redesigned app shell, production motion system, Supabase end-to-end,
and the homi.app companion website. Every commit passes `npx tsc --noEmit`.

## App — v2 redesign (Phase 1)

- **Quick actions**: replaced the three divergent action lists (constants + two
  inline screen copies) with one canonical 19-action set in
  `expo/constants/quickActions.ts` — `QuickActionItem` (intent, prefilledMessage,
  isNew, highPriority), `QUICK_ACTIONS_BY_INTENT`, `INTENT_ORDER/LABELS`,
  `DASHBOARD_QUICK_ACTIONS`. Tints come from designTokens. Legacy lowercase
  `quickActions` export removed; `scan.tsx` call site migrated.
- **Onboarding**: 3-path flow — ghost mode hero (offline-first:
  `setUserAsAnonymous()` → `completeOnboarding()` → dashboard), phone OTP
  (6-box input, iOS SMS autofill), Apple SSO entry point (iOS, marked coming
  soon — `expo-apple-authentication` not installed). New additive store
  helpers `completeOnboarding` / `setUserAsAnonymous`.
- **Dashboard**: yellow plate-chip hero (send enables at 3+ chars, camera
  shortcut), recent plates row, 6 quick actions + "All 19 →", feed with green
  "That's you!" / unread treatments, map strip, dismissible one-time welcome
  banner, referral card.
- **Send screen**: intent-grouped 19-action grid (Critical gets the red
  immediate-SMS banner), tap-to-prefill, 160-char counter (amber ≥130, red at
  160), anonymous toggle default ON, success state pivoting to referral.
- **Messages**: All/Received/Sent/Unread filters, unread tint + left border,
  delivery icons (Clock/Check/CheckCheck/SmartphoneNfc/AlertCircle), rows
  route to message-detail and mark read.
- **Types (additive only)**: `Message.deliveryState`
  (`sending|delivered|read|not_downloaded|failed`); `designTokens.plate`
  (plate yellow trio).

## Motion system (Phase 2)

- **Reanimated 4** (SDK 54 pairing; worklets plugin auto-injected by
  babel-preset-expo — the v4 equivalent of "reanimated plugin last") + Moti.
- `expo/lib/motion.ts`: `springs.snappy/gentle/bouncy`, `enterUp`/`enterFade`,
  `usePressScale`, `useShake`, `usePulse`, `useTabFocusScale` — all UI-thread,
  all reduced-motion aware.
- Applied: dashboard entrance stagger (40ms), plate-input focus ring + shake
  with error haptic on invalid submit, send button morph
  (idle→spinner→checkmark via AnimatePresence), success icon overshoot,
  messages layout transitions + pulsing unread dot, tab icon focus spring
  (1→1.12→settle), `Skeleton`/`SkeletonCard` shimmer gated on a new store
  `hydrated` flag, `SheetContainer` (spring-up + handle drag-to-dismiss)
  retrofitted onto ReportSheet.
- DECISION: `PreviewSendSheet` is imported nowhere (dead code) — left untouched.

## Supabase (Phase 3)

- **Migrations** (`supabase/migrations/`): 001 extensions
  (postgis/pg_cron/pg_net/uuid-ossp) + tables (`users` mirror with
  auto-provision trigger, `vehicles` with `vehicle_type` enum + normalized
  unique plates, `messages`, `message_tokens` 72h, `devices`, `events` with
  PostGIS point + geohash + TTL trigger mirroring `TYPE_EXPIRY_MINUTES`,
  `referrals`); 002 RLS everywhere — vehicles owner-only (plate→owner is
  service-role only, a hard privacy rule), messages participants-only with
  client inserts forced `to_user_id=null`, restrictive policy blocking
  anonymous referral inserts, DO block raising if any table lacks RLS;
  003 `broadcast_event()` → `realtime.send` on `geo:[geohash6]` topics,
  minutely pg_cron expiry sweep, `nearby_events` RPC; 004 `landing_events`.
- **Client**: `expo/lib/supabase.ts` (env-driven, AsyncStorage sessions,
  degrades to null when unconfigured — app stays offline-first). Store:
  optimistic sends with functional updates, rollback + rethrow on rejection,
  realtime postgres_changes subscription that re-arms on auth changes; ghost
  mode uses `signInAnonymously()`; OTP via `signInWithOtp`/`verifyOtp`, with
  anonymous→registered upgrade via `updateUser({phone})` +
  `verifyOtp(type:'phone_change')` (same auth row, history + local profile
  preserved).
- **Edge Functions**: `send-message` (webhook on messages INSERT; 10/h sender
  rate limit; push → SMS with `/m/[token]` link → in_app; highPriority never
  batched, critical-alerts channel) and `push` (service-role-only dispatcher);
  README covers secrets, webhook wiring, Twilio anti-fraud checklist
  (SMS Pumping Protection ON, Geo Permissions IL-only, $20/day usage trigger)
  and the SMS smoke test.

## Website (Phase 4) — `web/`

- Next.js 14 App Router, pnpm, Tailwind on HOMI dark tokens, Framer Motion,
  Outfit + JetBrains Mono via next/font.
- **/m/[token]**: service-role fetch; body truncated to ~30% **server-side**
  (blur is cosmetic; truncation is the security boundary); type-specific alert
  bar, plate chip, pulsing lock, UA-ordered store badges, graceful
  expired/missing state, privacy note, dynamic per-token OG image (next/og),
  `token_page_view`/`store_click` → `/api/t` → `landing_events`.
- **/** marketing page, fully static: hero with CSS phone mockup, 3-step
  how-it-works, 19-action marquee, live-map teaser, fleet CTA
  (<$5/vehicle/month), download section. All reveals respect
  prefers-reduced-motion. Hebrew toggle stubbed via wired next-intl
  (`messages/en.json`; adding `he.json` is the only step to go bilingual).

## Hardening (Phase 5)

- `ErrorBoundary` extracted to components/ (friendly fallback, report mailto,
  reset; preserves legacy storage-corruption auto-clear).
- Offline: netinfo banner; sends queue offline (persisted) and flush on
  reconnect; mid-request network failures queue instead of failing.
- Empty states: messages, feed, and live map (icon + copy + CTA, animated).
- Accessibility: roles/labels/state on all new touchables, 44pt+ targets,
  polite live region on the offline banner, reduced-motion throughout.
- app.json: scheme `homi`, iOS `applinks:homi.app`, Android autoVerify intent
  filter for `/m`; Android channels `critical-alerts` (MAX, bypass DnD) and
  `messages` (HIGH) created at startup; `+native-intent.tsx` now actually
  parses `/m/[token]` (previous stub had dead parameter names).
- expo-doctor: removed Rork `"<UNKNOWN>"` runtimeVersion/updates placeholders,
  fixed schema-invalid Android package (hyphens→underscores; pre-launch),
  patch-aligned SDK deps. 17/18 — remaining warning is a transitive
  `expo-location@15` duplicate inside `@rork-ai/toolkit-sdk` (not fixable here).

## Known gaps / follow-ups

- **No live Supabase project exists** — creating one is a billing action.
  Migrations/functions are ready to apply (`supabase db push`,
  `supabase functions deploy send-message push`). The SMS smoke test needs
  the project + Twilio credentials.
- Boot test ran as a clean iOS Hermes bundle export (`expo export`) — no
  Xcode/simulator on this machine; run a device boot before TestFlight.
- Apple SSO and Branch deferred deep links intentionally stubbed.
- `HOMI_Implementation.md` was absent from the repo; the five v2 files were
  implemented from the vault spec (Implementation Files / Quick Actions /
  Onboarding Flow / Screens & Flows / Design System).
