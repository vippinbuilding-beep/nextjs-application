import type { ProductProgress } from "@/core/models/product-progress";

export interface ProductProgressInput {
  positionSeconds: number;
  durationSeconds?: number;
  completed: boolean;
}

export interface ProductProgressRepository {
  getByProduct(productId: string): Promise<ProductProgress | null>;
  save(productId: string, data: ProductProgressInput): Promise<void>;
}
