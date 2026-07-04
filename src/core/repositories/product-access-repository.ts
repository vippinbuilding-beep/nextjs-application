import type {
  ProductAccess,
  ProductAccessSource,
} from "@/core/models/product-access";

export interface GrantAccessInput {
  userId: string;
  productId: string;
  source?: ProductAccessSource;
}

export interface ProductAccessRepository {
  /**
   * Whether the current (authenticated) user has an access row for the given
   * product. Does not account for creator ownership — check that separately.
   */
  hasAccess(productId: string): Promise<boolean>;
  /** Lists the products the current user has been granted access to. */
  listProductIdsForCurrentUser(): Promise<string[]>;
  /** Grants access to a user (only allowed for the product's creator by RLS). */
  grant(input: GrantAccessInput): Promise<ProductAccess>;
  /** Revokes a user's access (only allowed for the product's creator by RLS). */
  revoke(userId: string, productId: string): Promise<void>;
}
