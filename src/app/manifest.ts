import type { MetadataRoute } from "next";

import { SITE_LOGO_PATH } from "@/lib/metadata";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vippin",
    short_name: "Vippin",
    description:
      "Venda aulas e materiais digitais com Pix. Sua vitrine, seu link, sua renda.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafffa",
    theme_color: "#ffe502",
    lang: "pt-BR",
    categories: ["business", "education"],
    icons: [
      {
        src: SITE_LOGO_PATH,
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "any",
      },
      {
        src: SITE_LOGO_PATH,
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "maskable",
      },
      {
        src: SITE_LOGO_PATH,
        sizes: "180x180",
        type: "image/jpeg",
      },
    ],
  };
}
