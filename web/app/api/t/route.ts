import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const ALLOWED_EVENTS = new Set(["token_page_view", "store_click", "landing_view", "cta_click"]);

/**
 * Minimal landing analytics: POST { event, token?, store?, platform?, state? }.
 * Writes to public.landing_events via the service role. Always returns 204 —
 * analytics must never break the conversion path.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const event = String(body.event ?? "");
    if (!ALLOWED_EVENTS.has(event)) {
      return new NextResponse(null, { status: 204 });
    }

    const supabase = serviceClient();
    if (supabase) {
      await supabase.from("landing_events").insert({
        event,
        token: typeof body.token === "string" ? body.token.slice(0, 64) : null,
        meta: {
          store: typeof body.store === "string" ? body.store : undefined,
          platform: typeof body.platform === "string" ? body.platform : undefined,
          state: typeof body.state === "string" ? body.state : undefined,
        },
      });
    }
  } catch {
    // Swallow — see above.
  }
  return new NextResponse(null, { status: 204 });
}
