import type { NextRequest } from "next/server";

import { validateShippingPackage } from "@vippin/core/domain/shipping";
import type { ShippingMode } from "@vippin/core/models/product";
import { requireRouteCreator } from "@/lib/auth/route-auth";
import { estimateShippingForCreator } from "@/lib/shipping/quote";
import { getShipFrom } from "@/lib/shipping/ship-from";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Creator-side freight simulator (product form): reference capitals. */
export async function POST(request: NextRequest) {
  const auth = await requireRouteCreator();
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const pkg = {
    weightGrams: Number(body?.weightGrams),
    lengthCm: Number(body?.lengthCm),
    widthCm: Number(body?.widthCm),
    heightCm: Number(body?.heightCm),
  };
  const packageError = validateShippingPackage(pkg);
  if (packageError) return Response.json({ error: packageError }, { status: 400 });

  const priceCents = Math.max(0, Math.round(Number(body?.priceCents) || 0));
  const mode: ShippingMode = body?.mode === "free" ? "free" : "buyer_pays";

  const shipFrom = await getShipFrom(auth.user.id);
  if (!shipFrom) {
    return Response.json(
      { error: "Cadastre seu endereço de remetente para simular o frete." },
      { status: 409 }
    );
  }

  const estimates = await estimateShippingForCreator({ shipFrom, package: pkg, priceCents, mode });
  return Response.json({ estimates });
}
