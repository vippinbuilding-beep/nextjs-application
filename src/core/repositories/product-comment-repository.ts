import type { ProductComment } from "@/core/models/product-comment";

export interface ProductCommentInput {
  body: string;
  parentId?: string;
}

export interface ProductCommentRepository {
  listByProduct(productId: string): Promise<ProductComment[]>;
  create(productId: string, data: ProductCommentInput): Promise<ProductComment>;
  delete(commentId: string): Promise<void>;
}
