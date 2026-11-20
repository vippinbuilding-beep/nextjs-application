import type { NextRequest } from "next/server";

import { requireRouteCreator } from "@/lib/auth/route-auth";
import {
  getShipmentRepository,
  getShippingGateway,
} from "@vippin/supabase/factories/shipping-factory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Batch print: one PDF with several labels of the same creator. */
export async function POST(request: NextRequest) {
  const auth = await requireRouteCreator();
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids)
    ? body!.ids.filter((id): id is string => typeof id === "string").slice(0, 50)
    : [];
  if (!ids.length) {
    return Response.json({ error: "Selecione ao menos uma etiqueta." }, { status: 400 });
  }

  const repo = getShipmentRepository();
  const shipments = await Promise.all(ids.map((id) => repo.getById(id)));
  const labelIds: string[] = [];
  for (const shipment of shipments) {
    if (!shipment || shipment.creatorId !== auth.user.id) {
      return Response.json({ error: "Envio não encontrado." }, { status: 404 });
    }
    if (shipment.providerOrderId && ["printed", "purchased"].includes(shipment.status)) {
      labelIds.push(shipment.providerOrderId);
    }
  }
  if (!labelIds.length) {
    return Response.json({ error: "Nenhuma etiqueta pronta para imprimir." }, { status: 409 });
  }

  try {
    const url = await getShippingGateway().print(labelIds);
    return Response.json({ url, count: labelIds.length });
  } catch {
    return Response.json(
      { error: "Não conseguimos gerar o PDF agora. Tente novamente." },
      { status: 502 }
    );
  }
}
