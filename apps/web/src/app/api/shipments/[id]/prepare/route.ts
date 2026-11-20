import type { NextRequest } from "next/server";

import type { ShipmentDocumentType } from "@vippin/core/models/shipment";
import { requireRouteCreator } from "@/lib/auth/route-auth";
import { PrepareShipmentError, prepareShipment } from "@/lib/shipping/prepare-shipment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** "Preparar envio": buys + generates the label (central Melhor Envio wallet). */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRouteCreator();
  if (auth.error) return auth.error;
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const documentType: ShipmentDocumentType = body?.documentType === "nfe" ? "nfe" : "dce";
  const pkgRaw = body?.package as Record<string, unknown> | undefined;
  const pkg = pkgRaw
    ? {
        weightGrams: Number(pkgRaw.weightGrams),
        lengthCm: Number(pkgRaw.lengthCm),
        widthCm: Number(pkgRaw.widthCm),
        heightCm: Number(pkgRaw.heightCm),
      }
    : undefined;

  try {
    const result = await prepareShipment({
      shipmentId: id,
      creatorId: auth.user.id,
      documentType,
      invoiceKey: typeof body?.invoiceKey === "string" ? body.invoiceKey : undefined,
      package: pkg,
    });
    return Response.json({
      ok: true,
      fulfillmentStatus: result.order.fulfillmentStatus,
      trackingCode: result.shipment.trackingCode ?? null,
    });
  } catch (err) {
    if (err instanceof PrepareShipmentError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error("[shipments] prepare failed:", err);
    return Response.json({ error: "Falha ao preparar o envio." }, { status: 500 });
  }
}
