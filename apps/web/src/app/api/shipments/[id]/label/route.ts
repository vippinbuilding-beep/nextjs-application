import type { NextRequest } from "next/server";

import { requireRouteCreator } from "@/lib/auth/route-auth";
import {
  getShipmentRepository,
  getShippingGateway,
} from "@vippin/supabase/factories/shipping-factory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Prints (or re-prints) a label: validates the owner, asks Melhor Envio for
 * the PDF link and redirects (302) — same pattern as the media routes. The
 * link itself is never stored.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRouteCreator();
  if (auth.error) return auth.error;
  const { id } = await params;

  const shipment = await getShipmentRepository().getById(id);
  if (!shipment || shipment.creatorId !== auth.user.id) {
    return Response.json({ error: "Envio não encontrado." }, { status: 404 });
  }
  if (!shipment.providerOrderId || !["printed", "purchased", "posted"].includes(shipment.status)) {
    return Response.json({ error: "Esta etiqueta não está disponível." }, { status: 409 });
  }

  try {
    const url = await getShippingGateway().print([shipment.providerOrderId]);
    return Response.redirect(url, 302);
  } catch {
    return Response.json(
      { error: "Não conseguimos abrir a etiqueta agora. Tente novamente." },
      { status: 502 }
    );
  }
}
