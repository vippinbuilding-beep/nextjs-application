import "server-only";

import type { PublicSellerInfo } from "@/components/products/seller-info";
import { getSellerEligibility } from "@/lib/shipping/seller-eligibility";
import type { createSupabaseServerClient } from "@vippin/supabase/client/server";

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export interface PhysicalSaleInfo {
  /** "Vendido por" (Decreto 7.962/2013), document already masked by the RPC. */
  seller: PublicSellerInfo | null;
  /** Seller can receive a new order right now (profile, terms, PF limit). */
  available: boolean;
}

/** Public seller data + eligibility of a physical product (product page and checkout). */
export async function loadPhysicalSaleInfo(
  supabase: ServerClient,
  productId: string,
  creatorId: string
): Promise<PhysicalSaleInfo> {
  const [{ data: sellerRows }, eligibility] = await Promise.all([
    supabase.rpc("get_public_seller_info", { p_product_id: productId }),
    getSellerEligibility(creatorId).catch(() => null),
  ]);
  const info = (sellerRows as Record<string, string | null>[] | null)?.[0];
  const seller: PublicSellerInfo | null = info?.seller_name
    ? {
        name: info.seller_name,
        maskedDocument: info.masked_document ?? null,
        city: info.city ?? null,
        state: info.state ?? null,
        profile: info.seller_profile ?? null,
      }
    : null;
  return { seller, available: eligibility?.canSell ?? false };
}
