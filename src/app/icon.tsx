import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
          border: "16px solid #000000",
          borderRadius: "96px",
          fontSize: 280,
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
