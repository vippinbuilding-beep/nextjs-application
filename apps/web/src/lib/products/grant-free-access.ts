import "server-only";

import { sendFreeProductAccessNotifications } from "@/lib/notifications/order-events";
import { createSupabaseAdminClient } from "@vippin/supabase/client/admin";

export async function grantFreeProductAccess(
  productId: string,
  userId: string
): Promise<{ alreadyHadAccess: boolean }> {
  const admin = createSupabaseAdminClient();

  const { data: product } = await admin
    .from("products")
    .select("id, creator_id, price_cents, status")
    .eq("id", productId)
    .maybeSingle();

  if (!product || product.status !== "active") {
    throw new Error("Produto não encontrado.");
  }

  const priceCents = product.price_cents ?? 0;
  if (priceCents > 0) {
    throw new Error("Este produto não é gratuito.");
  }

  if (product.creator_id === userId) {
    throw new Error("Você já tem acesso ao seu próprio produto.");
  }

  const { count } = await admin
    .from("product_accesses")
    .select("product_id", { count: "exact", head: true })
    .eq("product_id", productId)
    .eq("user_id", userId);

  if ((count ?? 0) > 0) {
    return { alreadyHadAccess: true };
  }

  const { error } = await admin.from("product_accesses").insert({
    user_id: userId,
    product_id: productId,
    source: "free",
  });

  if (error) {
    throw new Error(`Não foi possível liberar o acesso: ${error.message}`);
  }

  await sendFreeProductAccessNotifications({
    productId,
    buyerId: userId,
    creatorId: product.creator_id,
  });

  return { alreadyHadAccess: false };
}
