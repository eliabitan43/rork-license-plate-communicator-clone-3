import type { Metadata } from "next";
import { headers } from "next/headers";
import { fetchTokenPayload } from "@/lib/landing";
import { TokenLanding } from "@/components/TokenLanding";

// User-specific, token-gated content — never cache or prerender.
export const dynamic = "force-dynamic";

interface PageProps {
  params: { token: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const payload = await fetchTokenPayload(params.token);
  const title =
    payload.state === "ok"
      ? `Message about ${payload.plate} — read it on HOMI`
      : "Message about your car — HOMI";
  return {
    title,
    description: "Someone left a message about your car. Download HOMI to read and reply.",
    robots: { index: false, follow: false },
  };
}

export default async function TokenPage({ params }: PageProps) {
  const payload = await fetchTokenPayload(params.token);

  const ua = headers().get("user-agent") ?? "";
  const platform: "ios" | "android" | "unknown" = /iPhone|iPad|iPod/i.test(ua)
    ? "ios"
    : /Android/i.test(ua)
      ? "android"
      : "unknown";

  return <TokenLanding payload={payload} token={params.token} platform={platform} />;
}
