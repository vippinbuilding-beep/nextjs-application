import type { ProductProgress } from "@vippin/core/models/product-progress";
import type {
  ProductProgressInput,
  ProductProgressRepository,
} from "@vippin/core/repositories/product-progress-repository";
import { supabase } from "../../client/client";

const TABLE = "product_progresses";

type ProductProgressRow = {
  user_id: string;
  product_id: string;
  position_seconds: number | string;
  duration_seconds: number | string | null;
  completed: boolean | null;
  updated_at: string | null;
};

export class SupabaseProductProgressRepository
  implements ProductProgressRepository
{
  async getByProduct(productId: string): Promise<ProductProgress | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("product_id", productId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;
    return toProductProgress(data as ProductProgressRow);
  }

  async save(productId: string, data: ProductProgressInput): Promise<void> {
    const { error } = await supabase.rpc("save_product_progress", {
      p_product_id: productId,
      p_position_seconds: Math.max(0, data.positionSeconds),
      p_duration_seconds:
        data.durationSeconds != null ? Math.max(0, data.durationSeconds) : null,
      p_completed: data.completed,
    });

    if (error) throw new Error(error.message);
  }
}

function toNumber(value: number | string | null): number | undefined {
  if (value == null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toProductProgress(row: ProductProgressRow): ProductProgress {
  return {
    userId: row.user_id,
    productId: row.product_id,
    positionSeconds: toNumber(row.position_seconds) ?? 0,
    durationSeconds: toNumber(row.duration_seconds),
    completed: row.completed ?? false,
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
}
