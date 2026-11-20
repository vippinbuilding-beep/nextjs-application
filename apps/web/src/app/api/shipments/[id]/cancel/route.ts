import type { NextRequest } from "next/server";

import { requireRouteCreator } from "@/lib/auth/route-auth";
import { PrepareShipmentError, cancelShipmentLabel } from "@/lib/shipping/prepare-shipment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cancels a label not yet posted; the order goes back to "aguardando envio". */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRouteCreator();
  if (auth.error) return auth.error;
  const { id } = await params;

  try {
    await cancelShipmentLabel(id, auth.user.id);
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof PrepareShipmentError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json({ error: "Falha ao cancelar a etiqueta." }, { status: 500 });
  }
}
