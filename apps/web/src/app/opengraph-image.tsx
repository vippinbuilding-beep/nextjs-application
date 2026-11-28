import { ImageResponse } from "next/og";

import { DEFAULT_DESCRIPTION } from "@/lib/metadata";

export const alt = "Vippin: venda aulas e materiais digitais com Pix";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Imagem de compartilhamento padrão (home, explorar e páginas sem imagem
 * própria). Vitrine e produto têm a sua em app/[creator]/.
 */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f7f7f8",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 34, fontWeight: 700, color: "#0a0a0b" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "#ffe502",
              fontSize: 34,
              fontWeight: 800,
            }}
          >
            V
          </div>
          Vippin
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 76, fontWeight: 700, color: "#0a0a0b", lineHeight: 1.05, maxWidth: 1000 }}>
            Venda aulas e materiais digitais com Pix
          </div>
          <div style={{ fontSize: 34, color: "#52525b", maxWidth: 960 }}>{DEFAULT_DESCRIPTION.split(". ").slice(1).join(". ")}</div>
        </div>

        <div
          style={{
            display: "flex",
            height: 10,
            borderRadius: 10,
            background: "linear-gradient(90deg, #84cc16, #ffd60a, #ff7a1a, #ff4fa3, #9b5cff)",
          }}
        />
      </div>
    ),
    size
  );
}
