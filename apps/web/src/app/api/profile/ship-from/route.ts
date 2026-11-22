import type { NextRequest } from "next/server";

import { requireRouteCreator } from "@/lib/auth/route-auth";
import { canSellPhysical, isDceAllowed } from "@/lib/shipping/config";
import { getShipFrom, parseShipFromInput, saveShipFrom } from "@/lib/shipping/ship-from";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Creator's sender address (PII) + whether they can sell physical products. */
export async function GET() {
  const auth = await requireRouteCreator();
  if (auth.error) return auth.error;

  const shipFrom = await getShipFrom(auth.user.id);
  return Response.json({
    allowed: canSellPhysical(auth.user.id),
    dceAllowed: isDceAllowed(),
    shipFrom,
  });
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
    return Response.json({ ok: true, shipFrom: await getShipFrom(auth.user.id) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao salvar o endereço.";
    return Response.json({ error: message }, { status: 500 });
  }
}
