import { ImageResponse } from "next/og";
import { fetchTokenPayload } from "@/lib/landing";

export const runtime = "nodejs";
export const alt = "Someone left a message about your car on HOMI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Dynamic OG image per token: plate + blurred teaser, so WhatsApp link
// previews show "this is about YOUR car" and convert.
export default async function OgImage({ params }: { params: { token: string } }) {
  const payload = await fetchTokenPayload(params.token);
  const plate = payload.state === "ok" ? (payload.plate ?? "") : "YOUR CAR";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#070810",
          gap: 36,
        }}
      >
        <div style={{ color: "#8892b8", fontSize: 34, display: "flex" }}>
          Someone left a message about
        </div>
        <div
          style={{
            display: "flex",
            background: "#ffe234",
            color: "#1a1600",
            border: "4px solid #d4b800",
            borderRadius: 18,
            padding: "18px 48px",
            fontSize: 88,
            fontWeight: 800,
            letterSpacing: 14,
          }}
        >
          {plate}
        </div>
        <div
          style={{
            display: "flex",
            background: "#141729",
            borderRadius: 22,
            padding: "28px 44px",
            color: "#eef0fb",
            fontSize: 36,
            filter: "blur(6px)",
            maxWidth: 860,
          }}
        >
          {payload.state === "ok" ? `${payload.teaser}…` : "Download HOMI to read messages…"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ color: "#1b6ef3", fontSize: 44, fontWeight: 800, display: "flex" }}>
            HOMI
          </div>
          <div style={{ color: "#8892b8", fontSize: 30, display: "flex" }}>
            — read it &amp; reply free
          </div>
        </div>
      </div>
    ),
    size,
  );
}
