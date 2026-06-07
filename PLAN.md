# HOMI Full React Native Redesign


## What will change

**5 files will be fully replaced:**

- [x] **Quick Actions constants** — Expands from 20 singleton actions to a categorised 19-action system split into 4 intents: Critical, Car, Road, and Community. Adds `highPriority` for SMS dispatch. Preserves existing `goodNeighborTemplates`, `quickReplies`, and `appVariants` exports.

- [x] **Dashboard** — Complete visual redesign with: monospace plate input on yellow background (like Israeli plates), category-grouped quick actions, live map strip, neighborhood feed with confirm/reply buttons, referral card, "You're registered" banner, and recent plate chips.

- [x] **Send Message** — Replaced with a category-grouped action grid (Critical → Car → Road → Community), each with colour-coded headers. Critical section shows an SMS banner. Includes character counter, anonymous toggle, and a cleaner send flow. One-tap message tiles removed per previous request.

- [x] **Messages / Inbox** — Redesigned with unread highlight rows, delivery status indicators (CheckCheck / Check), filter tabs (All / Received / Sent / Unread), "That's you" detection, and message type tags with colour coding.

- [x] **Onboarding** — Streamlined 3-step flow (Welcome → Phone → OTP). Welcome screen now has: ghost mode hero card for anonymous use, Apple sign-in, and phone sign-in options. No license plate required to proceed.

## Things to verify before writing

- [x] The `useToast` hook exists and is importable
- [x] `useAppStore` exposes `completeOnboarding`, `setUserAsAnonymous`, `markMessageAsRead`, `sendMessage`, `saveNotificationPrefs`
- [x] All Lucide icons used (`Fingerprint`, `Ghost`, `Flame`, `Gift`, `Check`, `CheckCheck`) are available
- [x] `designTokens` theme tokens match what the new code expects

## Risks

- The new code removes country/state/vehicle-type pickers from the dashboard and send-message screens — these were prominent features in the current app
- The new onboarding removes the existing license-plate-as-license-plate visual and the blue-gradient background scheme
- Existing draft-hydration logic in send-message.tsx will be replaced
