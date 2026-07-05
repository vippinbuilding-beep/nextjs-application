/**
 * Domain model for a product.
 *
 * This type is backend-agnostic: it must never import or reference Supabase
 * (or any other infrastructure) types. Infrastructure adapters are responsible
 * for mapping their own shapes to/from this model.
 */

// A single video lesson or a downloadable document.
export type ProductType = "single_lesson" | "document";

export interface Product {
  id: string;
  creatorId: string;
  type: ProductType;
  title: string;
  description?: string;
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
  createdAt: Date;
  updatedAt: Date;
}
