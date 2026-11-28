import { DEFAULT_DESCRIPTION, SITE_NAME, getSiteUrl, toAbsoluteUrl, truncateDescription } from "@/lib/metadata";

/**
 * Schema.org (JSON-LD) das páginas públicas, para o Google entender o que é
 * cada página (produto à venda com preço em BRL, perfil de criador, o site).
 * Só descreve o que a página mostra de verdade.
 */

type JsonLd = Record<string, unknown>;

export function organizationAndWebsiteJsonLd(): JsonLd[] {
  const siteUrl = getSiteUrl();
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: siteUrl,
      logo: toAbsoluteUrl("/icons/icon-512.png"),
      email: "suporte@vippin.com.br",
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: siteUrl,
      description: DEFAULT_DESCRIPTION,
      inLanguage: "pt-BR",
    },
  ];
}

export function creatorProfileJsonLd({
  name,
  slug,
  bio,
  imageUrl,
  sameAs,
}: {
  name: string;
  slug: string;
  bio: string | null;
  imageUrl: string | null;
  sameAs: string[];
}): JsonLd {
  const url = toAbsoluteUrl(`/@${slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url,
    mainEntity: {
      "@type": "Person",
      name,
      alternateName: `@${slug}`,
      url,
      ...(bio ? { description: truncateDescription(bio, 300) } : {}),
      ...(imageUrl ? { image: imageUrl } : {}),
      ...(sameAs.length ? { sameAs } : {}),
    },
  };
}

export function productJsonLd({
  name,
  description,
  priceCents,
  imageUrl,
  creatorName,
  creatorSlug,
  productSlug,
  inStock,
}: {
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  creatorName: string;
  creatorSlug: string;
  productSlug: string;
  inStock: boolean;
}): JsonLd[] {
  const creatorUrl = toAbsoluteUrl(`/@${creatorSlug}`);
  const url = toAbsoluteUrl(`/@${creatorSlug}/${productSlug}`);
  return [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name,
      url,
      ...(description ? { description: truncateDescription(description, 500) } : {}),
      ...(imageUrl ? { image: imageUrl } : {}),
      brand: { "@type": "Brand", name: creatorName },
      offers: {
        "@type": "Offer",
        url,
        price: (priceCents / 100).toFixed(2),
        priceCurrency: "BRL",
        availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        seller: { "@type": "Person", name: creatorName, url: creatorUrl },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: creatorName, item: creatorUrl },
        { "@type": "ListItem", position: 2, name, item: url },
      ],
    },
  ];
}
