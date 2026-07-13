import type { Product, ProductType } from "../models/product";

export interface ProductInput {
  type: ProductType;
  title: string;
  description?: string;
  priceCents: number;
  slug: string;
}

export interface ProductFileMetadata {
  filePath: string;
  fileName: string;
  fileMime: string;
  fileSize: number;
  mediaWidth?: number;
  mediaHeight?: number;
}

export interface ThumbnailMetadata {
  thumbnailPath: string;
  thumbnailMime: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
}

export interface ProductCreatorProfile {
  id: string;
  slug: string;
  handle: string;
}

export interface ProductWithCreator extends Product {
  creator: ProductCreatorProfile;
}

export interface ExploreProductsParams {
  query?: string;
  page?: number;
  pageSize?: number;
}

export interface ExploreProductsResult {
  items: ProductWithCreator[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Contract for product persistence and file storage. The UI and services
 * depend on this interface, never on a concrete backend. Implementations live
 * in `src/infrastructure`.
 */
export interface ProductRepository {
  create(creatorId: string, data: ProductInput): Promise<Product>;
  update(
    id: string,
    data: Partial<ProductInput & ProductFileMetadata & ThumbnailMetadata>
  ): Promise<void>;
  getById(id: string): Promise<Product | null>;
  getByCreatorAndSlug(
    creatorId: string,
    slug: string
  ): Promise<Product | null>;
  listByCreator(creatorId: string): Promise<Product[]>;
  /** Paginated explore feed with optional title/description/creator search. */
  searchExplore(params?: ExploreProductsParams): Promise<ExploreProductsResult>;
  /** Fetches products by id and attaches public creator profile metadata. */
  listByIds(ids: string[]): Promise<ProductWithCreator[]>;
  delete(id: string): Promise<void>;
  /**
   * Returns an available slug (unique within the caller's products) derived
   * from `base` (usually the product title). It does not persist anything.
   */
  generateUniqueSlug(base: string): Promise<string>;
  /**
   * Uploads a product file to the private storage bucket using a presigned
   * upload URL issued server-side (which validates ownership + size), and
   * returns its metadata. The bytes are never made public.
   */
  uploadFile(productId: string, file: File): Promise<ProductFileMetadata>;
  /**
   * Uploads a thumbnail image via a presigned upload URL issued server-side
   * and returns its metadata.
   */
  uploadThumbnail(productId: string, file: File): Promise<ThumbnailMetadata>;
}
