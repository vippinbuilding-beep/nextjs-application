import type { ProductType } from "@/core/models/product";

export interface ProductTypeConfig {
  label: string;
  shortLabel: string;
  description: string;
  /** `accept` attribute for the file input. */
  accept: string;
  /** Human-readable list of allowed formats. */
  allowedHint: string;
  /** Max upload size in bytes. */
  maxSize: number;
  uploadLabel: string;
}

const MB = 1024 * 1024;

/**
 * Product field limits. These mirror the CHECK constraints on
 * `public.products` (see `supabase/migrations/20260708_product_limits.sql` and
 * `20260716_product_price_minimum.sql`):
 * the client validation here is just UX, the database is the real guard.
 */
export const PRODUCT_LIMITS = {
  titleMin: 2,
  titleMax: 80,
  descriptionMax: 255,
  /** R$ 2,00 in cents — minimum for paid products (free = 0 is still allowed). */
  priceMinCents: 200,
  /** R$ 100,00 in cents. */
  priceMaxCents: 10_000,
} as const;

export const PRODUCT_TYPES: Record<ProductType, ProductTypeConfig> = {
  single_lesson: {
    label: "Aula única",
    shortLabel: "Aula",
    description: "Um vídeo-aula que sua audiência assiste na página do produto.",
    accept: "video/*",
    allowedHint: "Vídeos (mp4, webm, mov...)",
    maxSize: 500 * MB,
    uploadLabel: "Enviar vídeo da aula",
  },
  document: {
    label: "Documento",
    shortLabel: "Documento",
    description: "Um arquivo para download: PDF, Word, Excel, PowerPoint e mais.",
    accept:
      ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.odt,.ods,.odp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/csv,text/plain",
    allowedHint: "PDF, Word, Excel, PowerPoint, CSV, TXT",
    maxSize: 100 * MB,
    uploadLabel: "Enviar documento",
  },
};

/** Thumbnail images accept common web formats and are capped at 50 MB. */
export const THUMBNAIL_MAX_SIZE = 50 * MB;
export const THUMBNAIL_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

export function isProductType(value: string): value is ProductType {
  return value === "single_lesson" || value === "document";
}

export function getProductTypeConfig(type: ProductType): ProductTypeConfig {
  return PRODUCT_TYPES[type];
}

/** Returns an error message if the file is invalid for the type, else null. */
export function validateProductFile(
  type: ProductType,
  file: File
): string | null {
  const config = PRODUCT_TYPES[type];
  if (file.size > config.maxSize) {
    return `O arquivo é muito grande. Tamanho máximo: ${formatFileSize(
      config.maxSize
    )}.`;
  }
  return null;
}

/** Returns an error message if the thumbnail image is invalid, else null. */
export function validateThumbnailFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "A miniatura precisa ser uma imagem (PNG, JPG, WEBP ou GIF).";
  }
  if (file.size > THUMBNAIL_MAX_SIZE) {
    return `A imagem é muito grande. Tamanho máximo: ${formatFileSize(
      THUMBNAIL_MAX_SIZE
    )}.`;
  }
  return null;
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
