import { ImageResponse } from "next/og";

export const alt = "DotVault — Secure .env handoffs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
          color: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          DotVault
        </div>
        <p style={{ marginTop: 24, fontSize: 32, maxWidth: 900, lineHeight: 1.35 }}>
          Zero-knowledge .env handoffs — encrypted in your browser
        </p>
      </div>
    ),
    { ...size }
  );
}
