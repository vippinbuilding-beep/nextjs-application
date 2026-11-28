import type { NextRequest } from "next/server";

import { requireRouteCreator } from "@/lib/auth/route-auth";
import { canSellPhysical } from "@/lib/shipping/config";
import { getSellerEligibility, type SellerEligibility } from "@/lib/shipping/seller-eligibility";
import { parseShipFromInput, saveShipFrom } from "@/lib/shipping/ship-from";

function statusBody(creatorId: string, e: SellerEligibility) {
  return {
    allowed: canSellPhysical(creatorId),
    canSell: e.canSell,
    blockReason: e.blockReason ?? null,
    shipFrom: e.shipFrom,
    sellerProfile: e.profile,
    termsAccepted: e.termsAccepted,
    allowedDocumentTypes: e.allowedDocumentTypes,
    pfLimit: e.pfLimit,
  };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Creator's sender address (PII), fiscal profile and selling status (terms,
 * allowed label documents, PF monthly limit).
 */
export async function GET() {
  const auth = await requireRouteCreator();
  if (auth.error) return auth.error;

  return Response.json(statusBody(auth.user.id, await getSellerEligibility(auth.user.id)));
}

/** Saves the sender address (service role; profiles writes are server-only). */
export async function PUT(request: NextRequest) {
  const auth = await requireRouteCreator();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = parseShipFromInput(body);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    await saveShipFrom(auth.user.id, parsed.value);
    const eligibility = await getSellerEligibility(auth.user.id);
    return Response.json({ ok: true, ...statusBody(auth.user.id, eligibility) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao salvar o endereço.";
    return Response.json({ error: message }, { status: 500 });
  }
}
