import type { NextRequest } from "next/server";

import { isValidCep, onlyDigits } from "@vippin/core/domain/br-documents";
import { requireRouteUser } from "@/lib/auth/route-auth";
import { canSellPhysical } from "@/lib/shipping/config";
import { loadPhysicalProduct, quoteProductShipping } from "@/lib/shipping/quote";
import { getShipFrom } from "@/lib/shipping/ship-from";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Freight options for a physical product and the buyer's CEP. The price shown
 * here is indicative; checkout re-quotes server-side before charging.
 */
export async function POST(request: NextRequest) {
  const auth = await requireRouteUser();
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => null)) as
    | { productId?: unknown; postalCode?: unknown }
    | null;
  const productId = typeof body?.productId === "string" ? body.productId : "";
  const postalCode = onlyDigits(typeof body?.postalCode === "string" ? body.postalCode : "");
  if (!productId || !isValidCep(postalCode)) {
    return Response.json({ error: "Informe um CEP válido." }, { status: 400 });
  }

  const product = await loadPhysicalProduct(productId);
  if (!product || product.status !== "active" || !canSellPhysical(product.creatorId)) {
    return Response.json({ error: "Produto não encontrado." }, { status: 404 });
  }
  if (product.stock <= 0) {
    return Response.json({ error: "Produto esgotado." }, { status: 409 });
  }

  const shipFrom = await getShipFrom(product.creatorId);
  if (!shipFrom) {
    return Response.json(
      { error: "O criador ainda não configurou o envio deste produto." },
      { status: 409 }
    );
  }

  try {
    const quote = await quoteProductShipping(product, shipFrom, postalCode);
    return Response.json({ ...quote, productCents: product.priceCents });
  } catch {
    return Response.json(
      { error: "Não conseguimos calcular o frete agora. Tente novamente." },
      { status: 502 }
    );
  }
}
