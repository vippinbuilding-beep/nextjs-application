import { ImageResponse } from "next/og";

import { DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/metadata";

export const alt = SITE_NAME;
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
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
          background: "#fafffa",
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #00000014 1px, transparent 0)",
          backgroundSize: "24px 24px",
          padding: 80,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 160,
            height: 160,
            borderRadius: 40,
            background: "#ffe502",
            border: "8px solid #000000",
            fontSize: 96,
            fontWeight: 700,
            color: "#000000",
          }}
        >
          V
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: "#000000",
            }}
          >
            {SITE_NAME}
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 500,
              color: "#4b4b4b",
              maxWidth: 900,
              lineHeight: 1.3,
            }}
          >
            {DEFAULT_DESCRIPTION}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
