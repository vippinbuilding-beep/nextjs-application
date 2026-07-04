import type {
  ProductAccess,
  ProductAccessSource,
} from "@/core/models/product-access";
import type {
  GrantAccessInput,
  ProductAccessRepository,
} from "@/core/repositories/product-access-repository";
import { supabase } from "@/lib/supabase/client";

const TABLE = "product_accesses";

type ProductAccessRow = {
  id: string;
  user_id: string;
  product_id: string;
  source: string | null;
  granted_at: string | null;
};

export class SupabaseProductAccessRepository
  implements ProductAccessRepository
{
  async hasAccess(productId: string): Promise<boolean> {
    const { count, error } = await supabase
      .from(TABLE)
      .select("product_id", { count: "exact", head: true })
      .eq("product_id", productId);

    if (error) throw new Error(error.message);
    return (count ?? 0) > 0;
  }

  async listProductIdsForCurrentUser(): Promise<string[]> {
    const { data, error } = await supabase.from(TABLE).select("product_id");
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => (row as { product_id: string }).product_id);
  }

  async grant(input: GrantAccessInput): Promise<ProductAccess> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        user_id: input.userId,
        product_id: input.productId,
        source: input.source ?? "manual",
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return toProductAccess(data as ProductAccessRow);
  }

  async revoke(userId: string, productId: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq("user_id", userId)
      .eq("product_id", productId);

    if (error) throw new Error(error.message);
  }
}

function toProductAccess(row: ProductAccessRow): ProductAccess {
  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    source: (row.source ?? "manual") as ProductAccessSource,
    grantedAt: row.granted_at ? new Date(row.granted_at) : new Date(),
  };
}
