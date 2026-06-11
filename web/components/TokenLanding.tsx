"use client";

import { useCallback, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { TokenPayload } from "@/lib/landing";

// DECISION: store listings don't exist pre-launch; env overrides land later
// without a code change. Until then both badges fall back to the homepage CTA.
const APP_STORE_URL =
  process.env.NEXT_PUBLIC_APP_STORE_URL ?? "https://homi.app/#download";
const PLAY_STORE_URL =
  process.env.NEXT_PUBLIC_PLAY_STORE_URL ?? "https://homi.app/#download";

const ALERT_STYLES: Record<string, string> = {
  urgent: "bg-danger text-white",
  warning: "bg-warning text-plateText",
  success: "bg-success text-white",
  info: "bg-brand text-white",
};

interface Props {
  payload: TokenPayload;
  token: string;
  platform: "ios" | "android" | "unknown";
}

function track(event: string, token: string, extra?: Record<string, string>) {
  // Fire-and-forget; never block the conversion path on analytics.
  try {
    void fetch("/api/t", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, token, ...extra }),
      keepalive: true,
    });
  } catch {
    /* noop */
  }
}

export function TokenLanding({ payload, token, platform }: Props) {
  const reduced = useReducedMotion();

  useEffect(() => {
    track("token_page_view", token, { state: payload.state, platform });
  }, [token, payload.state, platform]);

  const onStoreClick = useCallback(
    (store: "app_store" | "play_store") => {
      track("store_click", token, { store, platform });
    },
    [token, platform],
  );

  const slideDown = reduced
    ? {}
    : {
        initial: { opacity: 0, y: -24 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.35, ease: "easeOut" as const },
      };

  const fadeUp = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay, ease: "easeOut" as const },
        };

  if (payload.state !== "ok") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
        <motion.div {...fadeUp(0)} className="text-5xl" aria-hidden>
          ⏳
        </motion.div>
        <motion.h1 {...fadeUp(0.05)} className="text-2xl font-bold">
          This message link has expired
        </motion.h1>
        <motion.p {...fadeUp(0.1)} className="text-text2">
          Download HOMI to see messages about your car the moment they arrive —
          no expired links, ever.
        </motion.p>
        <StoreBadges platform={platform} onClick={onStoreClick} />
        <PrivacyNote />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-10">
      {/* Type-specific alert bar */}
      <motion.div
        {...slideDown}
        role="status"
        className={`mt-4 rounded-lg2 px-4 py-3 text-center text-sm font-bold ${ALERT_STYLES[payload.alertKind ?? "info"]}`}
      >
        {payload.alertLabel}
      </motion.div>

      {/* Plate chip */}
      <motion.div {...fadeUp(0.1)} className="mt-8 flex justify-center">
        <span className="rounded-md border border-plateBorder bg-plate px-5 py-2 font-mono text-2xl font-bold tracking-[0.2em] text-plateText">
          {payload.plate}
        </span>
      </motion.div>

      {/* Blurred message card — teaser is already server-truncated */}
      <motion.div
        {...fadeUp(0.18)}
        className="relative mt-6 overflow-hidden rounded-xl2 border border-line2 bg-surface2 p-6"
      >
        <p className="select-none text-lg leading-relaxed text-text1 blur-[7px]" aria-hidden>
          {payload.teaser}
          {"…"}
        </p>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={reduced ? undefined : { scale: [1, 1.12, 1] }}
            transition={reduced ? undefined : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-surface3 text-2xl shadow-lg"
            aria-hidden
          >
            🔒
          </motion.div>
        </div>
        <span className="sr-only">
          The full message is locked. Download HOMI to read it.
        </span>
      </motion.div>

      {/* CTA */}
      <motion.div {...fadeUp(0.26)} className="mt-8 text-center">
        <h1 className="text-2xl font-extrabold leading-tight">
          Download HOMI to read &amp; reply
        </h1>
        <p className="mt-2 text-text2">
          Free forever. Takes less than a minute.
        </p>
      </motion.div>

      <motion.div {...fadeUp(0.32)}>
        <StoreBadges platform={platform} onClick={onStoreClick} />
      </motion.div>

      {/* Social proof */}
      <motion.div
        {...fadeUp(0.4)}
        className="mt-8 flex items-center justify-center gap-6 text-center text-xs text-text3"
      >
        <span>🚗 Drivers across Tel Aviv</span>
        <span>⚡ Instant delivery</span>
        <span>👻 Anonymous by default</span>
      </motion.div>

      <PrivacyNote />
    </main>
  );
}

function StoreBadges({
  platform,
  onClick,
}: {
  platform: "ios" | "android" | "unknown";
  onClick: (store: "app_store" | "play_store") => void;
}) {
  const ios = (
    <a
      key="ios"
      href={APP_STORE_URL}
      onClick={() => onClick("app_store")}
      className={`flex items-center justify-center gap-2 rounded-lg2 px-6 py-4 font-semibold transition-transform hover:scale-[1.02] ${
        platform !== "android"
          ? "bg-brand text-white shadow-lg shadow-brand/30"
          : "border border-line2 bg-surface2 text-text1"
      }`}
    >
       Download for iPhone
    </a>
  );
  const android = (
    <a
      key="android"
      href={PLAY_STORE_URL}
      onClick={() => onClick("play_store")}
      className={`flex items-center justify-center gap-2 rounded-lg2 px-6 py-4 font-semibold transition-transform hover:scale-[1.02] ${
        platform === "android"
          ? "bg-brand text-white shadow-lg shadow-brand/30"
          : "border border-line2 bg-surface2 text-text1"
      }`}
    >
      ▶ Get it on Google Play
    </a>
  );

  return (
    <div className="mt-6 flex w-full flex-col gap-3">
      {platform === "android" ? [android, ios] : [ios, android]}
    </div>
  );
}

function PrivacyNote() {
  return (
    <p className="mt-10 text-center text-xs leading-relaxed text-text3">
      Sender is anonymous. HOMI never shares phone numbers.
    </p>
  );
}
