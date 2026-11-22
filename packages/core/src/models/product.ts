/**
 * Domain model for a product.
 *
 * This type is backend-agnostic: it must never import or reference Supabase
 * (or any other infrastructure) types. Infrastructure adapters are responsible
 * for mapping their own shapes to/from this model.
 */

// A single video lesson, a downloadable document or a physical item shipped
// by the creator (via Melhor Envio).
export type ProductType = "single_lesson" | "document" | "physical";

export type ProductStatus = "active" | "cancelled";

/**
 * Who pays the freight of a physical product:
 * - `buyer_pays`: quoted at checkout and added to the PIX;
 * - `free`: free for the buyer — the cost comes out of the creator's share.
 */
export type ShippingMode = "buyer_pays" | "free";

export interface Product {
  id: string;
  creatorId: string;
  type: ProductType;
  title: string;
  description?: string;
  status: ProductStatus;
  // Price is always stored in cents to avoid floating-point issues.
  priceCents: number;
  // Unique (per creator) public handle used to build the product link:
  // /@<creator slug>/<slug>.
  slug: string;
  // Metadata for the file stored in the `products` Storage bucket.
  filePath?: string;
  fileName?: string;
  fileMime?: string;
  fileSize?: number;
  // Optional thumbnail image shown instead of the generic type icon.
  thumbnailPath?: string;
  thumbnailMime?: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  // Dimensions of the main media file (e.g. video), used when no thumbnail exists.
  mediaWidth?: number;
  mediaHeight?: number;
  // Physical products only: packed weight/dimensions, stock and freight payer.
  weightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  stock?: number;
  shippingMode?: ShippingMode;
  createdAt: Date;
  updatedAt: Date;
}
