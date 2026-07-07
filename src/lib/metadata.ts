import type { Metadata } from "next";

/** Fallback when `NEXT_PUBLIC_SITE_URL` is not set (local dev). */
const LOCAL_SITE_URL = "http://localhost:3000";

export const SITE_NAME = "Vippin";

export const SITE_LOGO_PATH = "/icon-logo.jpg";

export const DEFAULT_DESCRIPTION =
  "Venda aulas e materiais digitais com Pix. Sua vitrine, seu link, sua renda.";

/** Absolute origin used for Open Graph / Twitter cards and canonical URLs. */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;

  const vercel = process.env.VERCEL_URL?.replace(/\/$/, "");
  if (vercel) return `https://${vercel}`;

  return LOCAL_SITE_URL;
}

export function toAbsoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalized}`;
}

/** Removes `http://` or `https://` from an origin or absolute URL. */
export function stripUrlProtocol(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/** Shareable creator profile link without protocol, e.g. `vippin.com.br/@slug`. */
export function formatCreatorShareLink(slug: string, origin: string): string {
  return `${stripUrlProtocol(origin)}/@${slug}`;
}

export function truncateDescription(text: string, maxLength = 160): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

/** Meta tags for Facebook (Sharing Debugger expects fb:app_id when configured). */
function facebookAppMetadata(): Pick<Metadata, "other"> | undefined {
  const appId = process.env.FACEBOOK_APP_ID?.trim();
  if (!appId) return undefined;
  return {
    other: {
      "fb:app_id": appId,
    },
  };
}

export function createRootMetadata(): Metadata {
  return {
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: SITE_NAME,
      template: `%s | ${SITE_NAME}`,
    },
    description: DEFAULT_DESCRIPTION,
    applicationName: SITE_NAME,
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: SITE_NAME,
    },
    formatDetection: {
      telephone: false,
    },
    alternates: {
      canonical: "/",
    },
    icons: {
      icon: SITE_LOGO_PATH,
      apple: SITE_LOGO_PATH,
    },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: SITE_NAME,
      title: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
      url: "/",
      images: [
        {
          url: SITE_LOGO_PATH,
          alt: SITE_NAME,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
      images: [SITE_LOGO_PATH],
    },
    ...facebookAppMetadata(),
  };
}

export function createCreatorMetadata({
  handle,
  slug,
  productCount,
  userId,
  avatarPath,
  avatarUrl,
}: {
  handle: string;
  slug: string;
  productCount: number;
  userId?: string;
  avatarPath?: string | null;
  avatarUrl?: string | null;
}): Metadata {
  const displayHandle = handle;
  const title = displayHandle;
  const description =
    productCount > 0
      ? `${displayHandle} no Vippin — confira ${productCount} ${productCount === 1 ? "produto" : "produtos"} de aulas e materiais digitais.`
      : `${displayHandle} no Vippin — vitrine de aulas e materiais digitais.`;
  const path = `/@${slug}`;
  const ogImage =
    userId && (avatarPath || avatarUrl)
      ? toAbsoluteUrl(`/api/profiles/${userId}/avatar`)
      : undefined;

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "profile",
      title,
      description,
      url: path,
      ...(ogImage
        ? {
            images: [
              {
                url: ogImage,
                alt: displayHandle,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary_large_image",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    ...facebookAppMetadata(),
  };
}

export function createProductMetadata({
  title,
  description,
  priceCents,
  creatorHandle,
  creatorSlug,
  productSlug,
  productId,
  thumbnailPath,
  type,
}: {
  title: string;
  description: string | null;
  priceCents: number;
  creatorHandle: string;
  creatorSlug: string;
  productSlug: string;
  productId: string;
  thumbnailPath: string | null;
  type: "single_lesson" | "document";
}): Metadata {
  const typeLabel = type === "single_lesson" ? "Aula" : "Material";
  const priceLabel = priceCents === 0 ? "Grátis" : undefined;
  const fallbackDescription = priceLabel
    ? `${typeLabel} ${priceLabel} de ${creatorHandle} no Vippin.`
    : `${typeLabel} de ${creatorHandle} no Vippin.`;
  const metaDescription = truncateDescription(
    description?.trim() || fallbackDescription,
  );
  const path = `/@${creatorSlug}/${productSlug}`;
  const ogImage = thumbnailPath
    ? toAbsoluteUrl(`/api/products/${productId}/thumbnail`)
    : undefined;

  return {
    title,
    description: metaDescription,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      title,
      description: metaDescription,
      url: path,
      ...(ogImage
        ? {
            images: [
              {
                url: ogImage,
                alt: title,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description: metaDescription,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    ...facebookAppMetadata(),
  };
}
