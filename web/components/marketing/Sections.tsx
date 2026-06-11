"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";

/** Shared scroll-reveal wrapper: fade + rise when the section enters view. */
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export function Header() {
  const t = useTranslations("header");
  return (
    <header className="sticky top-0 z-20 border-b border-line1 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <a href="#top" className="text-xl font-extrabold tracking-tight text-brand">
          HOMI
        </a>
        <nav className="flex items-center gap-5 text-sm">
          <a href="#fleet" className="text-text2 hover:text-text1">
            {t("fleet")}
          </a>
          {/* Hebrew toggle stub — next-intl is wired; he.json flips this live */}
          <button
            type="button"
            title={t("languageToggleHint")}
            className="rounded-full border border-line2 px-3 py-1 text-xs font-semibold text-text2"
          >
            EN · עב
          </button>
          <a
            href="#download"
            className="rounded-lg2 bg-brand px-4 py-2 font-semibold text-white shadow-lg shadow-brand/25 hover:brightness-110"
          >
            {t("download")}
          </a>
        </nav>
      </div>
    </header>
  );
}

export function Hero() {
  const t = useTranslations("hero");
  return (
    <section id="top" className="mx-auto grid max-w-5xl gap-12 px-5 pb-20 pt-16 md:grid-cols-2 md:items-center">
      <Reveal>
        <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
          {t("headline")}
        </h1>
        <p className="mt-5 max-w-md text-lg text-text2">{t("subhead")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#download"
            className="rounded-lg2 bg-brand px-6 py-3.5 font-bold text-white shadow-lg shadow-brand/30 hover:brightness-110"
          >
            {t("ctaPrimary")}
          </a>
          <a
            href="#how"
            className="rounded-lg2 border border-line2 px-6 py-3.5 font-semibold text-text1 hover:bg-surface2"
          >
            {t("ctaSecondary")}
          </a>
        </div>
      </Reveal>

      {/* CSS phone mockup of the dashboard — no image payload */}
      <Reveal delay={0.15} className="flex justify-center">
        <div className="w-[290px] rounded-[40px] border border-line2 bg-surface1 p-3 shadow-2xl shadow-black/60">
          <div className="rounded-[30px] bg-bg p-4">
            <div className="mx-auto mb-4 h-1.5 w-20 rounded-full bg-surface3" />
            <p className="text-sm font-bold">Hi, Ghost driver 👋</p>
            <p className="text-[11px] text-text3">Send a quick message to any driver</p>
            <div className="mt-3 rounded-lg2 border border-plateBorder bg-plate px-3 py-3 text-center font-mono text-xl font-bold tracking-[0.25em] text-plateText">
              12·345·67
            </div>
            <div className="mt-2 rounded-lg2 bg-brand py-2.5 text-center text-sm font-bold text-white">
              Send message
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px] text-text2">
              {["🚗 Blocking", "💡 Lights on", "🚨 Towed", "🪟 Window", "🚨 Child/pet", "❤️ Nice ride"].map(
                (a) => (
                  <div key={a} className="rounded-sm2 border border-line1 bg-surface2 px-1 py-2.5">
                    {a}
                  </div>
                ),
              )}
            </div>
            <div className="mt-4 rounded-lg2 border-l-2 border-success bg-surface2 p-2.5">
              <span className="rounded bg-plate px-1.5 py-0.5 font-mono text-[9px] font-bold text-plateText">
                TK·6821
              </span>
              <span className="ml-2 rounded-full bg-success/15 px-1.5 text-[9px] font-bold text-success">
                That&apos;s you!
              </span>
              <p className="mt-1.5 text-[11px] text-text1">
                Hi! Your headlights are still on…
              </p>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function HowItWorks() {
  const t = useTranslations("how");
  const steps = [
    { emoji: "🔢", title: t("step1Title"), body: t("step1Body") },
    { emoji: "⚡", title: t("step2Title"), body: t("step2Body") },
    { emoji: "📬", title: t("step3Title"), body: t("step3Body") },
  ];
  return (
    <section id="how" className="mx-auto max-w-5xl px-5 py-16">
      <Reveal>
        <h2 className="text-center text-3xl font-extrabold">{t("title")}</h2>
      </Reveal>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {steps.map((s, i) => (
          <Reveal key={s.title} delay={i * 0.1}>
            <div className="h-full rounded-xl2 border border-line1 bg-surface1 p-6">
              <div className="text-3xl" aria-hidden>
                {s.emoji}
              </div>
              <h3 className="mt-3 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text2">{s.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const MARQUEE_ACTIONS = [
  "🔥 Smoke / fire",
  "🚨 Child / pet inside",
  "💧 Fluid leaking",
  "🚨 Being towed",
  "🚗 Blocking me",
  "💡 Lights on",
  "🚪 Door / boot open",
  "🪟 Window open",
  "🛞 Low tyre",
  "🔑 Keys visible",
  "📋 Expired sticker",
  "💥 Hit & run",
  "⚠️ Road debris",
  "🚗 Erratic driving",
  "📱 Phone at wheel",
  "⚠️ Parking issue",
  "🅿️ Spot opening up",
  "🤝 Thank you for merging",
  "❤️ Nice ride",
];

export function ActionsMarquee() {
  const reduced = useReducedMotion();
  const row = MARQUEE_ACTIONS.map((a) => (
    <span
      key={a}
      className="mx-2 inline-block whitespace-nowrap rounded-full border border-line2 bg-surface2 px-4 py-2 text-sm text-text1"
    >
      {a}
    </span>
  ));
  return (
    <section className="overflow-hidden border-y border-line1 bg-surface1 py-8">
      <p className="mb-5 text-center text-sm font-bold uppercase tracking-widest text-text3">
        19 quick actions — one tap each
      </p>
      {reduced ? (
        <div className="flex flex-wrap justify-center gap-y-3 px-5">{row}</div>
      ) : (
        <motion.div
          className="flex w-max"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          aria-hidden
        >
          <div className="flex">{row}</div>
          <div className="flex">{row}</div>
        </motion.div>
      )}
    </section>
  );
}

export function MapTeaser() {
  const t = useTranslations("map");
  const pins = [
    { left: "18%", top: "30%", label: "⚠️" },
    { left: "55%", top: "18%", label: "🚓" },
    { left: "72%", top: "55%", label: "🅿️" },
    { left: "35%", top: "65%", label: "🚧" },
  ];
  return (
    <section className="mx-auto max-w-5xl px-5 py-16">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <Reveal>
          <h2 className="text-3xl font-extrabold">{t("title")}</h2>
          <p className="mt-4 max-w-md leading-relaxed text-text2">{t("body")}</p>
        </Reveal>
        <Reveal delay={0.12}>
          <div className="relative h-64 overflow-hidden rounded-xl2 border border-line2 bg-surface2">
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "linear-gradient(var(--border-2) 1px, transparent 1px), linear-gradient(90deg, var(--border-2) 1px, transparent 1px)",
                backgroundSize: "36px 36px",
              }}
              aria-hidden
            />
            {pins.map((p) => (
              <span
                key={p.left}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface3 p-2 text-lg shadow-lg"
                style={{ left: p.left, top: p.top }}
                aria-hidden
              >
                {p.label}
              </span>
            ))}
            <span className="absolute bottom-3 left-3 rounded-md bg-bg/80 px-2 py-1 font-mono text-xs text-cyan">
              52 km/h
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function FleetCta() {
  const t = useTranslations("fleet");
  return (
    <section id="fleet" className="mx-auto max-w-5xl px-5 py-10">
      <Reveal>
        <div className="flex flex-col items-start justify-between gap-6 rounded-xl2 border border-brand/30 bg-gradient-to-r from-brand/15 to-surface1 p-8 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-extrabold">{t("title")}</h2>
            <p className="mt-2 max-w-xl text-text2">{t("body")}</p>
          </div>
          <a
            href="mailto:fleet@homi.app"
            className="shrink-0 rounded-lg2 bg-brand px-6 py-3.5 font-bold text-white shadow-lg shadow-brand/30 hover:brightness-110"
          >
            {t("cta")}
          </a>
        </div>
      </Reveal>
    </section>
  );
}

export function DownloadSection() {
  const t = useTranslations("download");
  return (
    <section id="download" className="mx-auto max-w-3xl px-5 py-20 text-center">
      <Reveal>
        <h2 className="text-3xl font-extrabold md:text-4xl">{t("title")}</h2>
        <p className="mt-3 text-text2">{t("body")}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <a
            href={process.env.NEXT_PUBLIC_APP_STORE_URL ?? "#download"}
            className="rounded-lg2 bg-brand px-7 py-4 font-bold text-white shadow-lg shadow-brand/30 hover:brightness-110"
          >
             {t("ios")}
          </a>
          <a
            href={process.env.NEXT_PUBLIC_PLAY_STORE_URL ?? "#download"}
            className="rounded-lg2 border border-line2 bg-surface2 px-7 py-4 font-semibold text-text1 hover:bg-surface3"
          >
            ▶ {t("android")}
          </a>
        </div>
      </Reveal>
    </section>
  );
}

export function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="border-t border-line1 py-10 text-center text-xs text-text3">
      <p>{t("privacy")}</p>
      <p className="mt-2">© {new Date().getFullYear()} HOMI · Tel Aviv</p>
    </footer>
  );
}
