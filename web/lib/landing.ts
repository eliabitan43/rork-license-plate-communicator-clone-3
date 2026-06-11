import "server-only";
import { serviceClient } from "./supabase-server";

export type AlertKind = "urgent" | "warning" | "success" | "info";

export interface TokenPayload {
  state: "ok" | "expired" | "missing";
  plate?: string;
  category?: string;
  alertKind?: AlertKind;
  alertLabel?: string;
  /** Server-truncated teaser — never more than ~30% of the body. */
  teaser?: string;
  isAnonymous?: boolean;
  createdAt?: string;
}

const URGENT_CATEGORIES = new Set([
  "tow_warning",
  "child_pet_alert",
  "break_in_alert",
  "hazard",
  "leaking_fluid",
  "car_alarm",
  "vehicle_alarm",
]);

const WARNING_CATEGORIES = new Set([
  "parking_alert",
  "blocking",
  "street_cleaning",
  "lights_on",
  "flat_tire",
]);

function classify(category: string): { kind: AlertKind; label: string } {
  if (URGENT_CATEGORIES.has(category)) {
    return { kind: "urgent", label: "Urgent alert about your vehicle" };
  }
  if (WARNING_CATEGORIES.has(category)) {
    return { kind: "warning", label: "Heads up about your parked car" };
  }
  if (category === "compliment") {
    return { kind: "success", label: "A driver sent you some kindness" };
  }
  return { kind: "info", label: "A driver left you a message" };
}

/**
 * Truncate server-side to ~30% of the body. The blur on the client is
 * cosmetic; THIS is the security boundary — the rest of the message
 * never leaves the server.
 */
function teaserOf(body: string): string {
  const cut = Math.min(body.length, Math.max(24, Math.ceil(body.length * 0.3)));
  return body.slice(0, cut);
}

export async function fetchTokenPayload(token: string): Promise<TokenPayload> {
  const supabase = serviceClient();
  if (!supabase) return { state: "missing" };

  // Tokens are 32 hex chars; reject junk before touching the database.
  if (!/^[a-f0-9]{16,64}$/i.test(token)) return { state: "missing" };

  const { data, error } = await supabase
    .from("message_tokens")
    .select(
      "token, expires_at, claimed_at, messages ( to_plate_normalized, category, body, is_anonymous, created_at )",
    )
    .eq("token", token)
    .maybeSingle();

  if (error || !data || !data.messages) return { state: "missing" };

  const message = Array.isArray(data.messages) ? data.messages[0] : data.messages;
  if (!message) return { state: "missing" };

  if (new Date(data.expires_at).getTime() < Date.now()) {
    return { state: "expired" };
  }

  const { kind, label } = classify(message.category);

  return {
    state: "ok",
    plate: message.to_plate_normalized,
    category: message.category,
    alertKind: kind,
    alertLabel: label,
    teaser: teaserOf(message.body),
    isAnonymous: message.is_anonymous,
    createdAt: message.created_at,
  };
}
