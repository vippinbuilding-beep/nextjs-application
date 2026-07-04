import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffe502",
          border: "6px solid #000000",
          borderRadius: "36px",
          fontSize: 100,
          fontWeight: 700,
          color: "#000000",
        }}
      >
        V
      </div>
    ),
    { ...size },
  );
}
