/**
 * Domain model for a user's access (entitlement) to a product.
 *
 * The product's creator always has implicit access to their own product; this
 * model represents access granted to other users. Backend-agnostic: never
 * reference Supabase (or any other infrastructure) types here.
 */

// How the access was granted. `purchase` is reserved for the future PIX flow.
export type ProductAccessSource = "manual" | "purchase" | "free";

export interface ProductAccess {
  id: string;
  userId: string;
  productId: string;
  source: ProductAccessSource;
  grantedAt: Date;
}
