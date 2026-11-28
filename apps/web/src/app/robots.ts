import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/metadata";

/**
 * Libera as páginas públicas (home, explorar, vitrines `/@criador` e produtos)
 * e bloqueia áreas logadas, APIs e o checkout, que não têm valor de busca.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        // Imagens de compartilhamento (capa do produto, avatar) ficam em /api.
        allow: ["/", "/api/products/*/thumbnail", "/api/profiles/*/avatar"],
        disallow: [
          "/api/",
          "/auth/",
          "/login",
          "/onboarding",
          "/painel",
          "/products",
          "/profile",
          "/my-products",
          "/my-orders",
          "/my-questions",
          "/*/checkout",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
