import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

import {
  holdOrder,
  recordShippingAdjustment,
  refundPhysicalOrder,
  releaseOrder,
  type EscrowActor,
} from "@/lib/payments/escrow";
import { getOrderRepository } from "@vippin/supabase/factories/payment-factory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Internal endpoint for the admin dashboard's escrow overrides (liberar /
 * reter / reembolsar / ajuste de frete). Keeps a single implementation of the
 * escrow rules (this app). Auth: `Authorization: Bearer $ADMIN_API_SECRET`
 * (shared server-side with apps/dashboard); `actorUserId` is the admin who
 * acted and is recorded in `fulfillment_events` / `shipping_adjustments`.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.ADMIN_API_SECRET;
  const provided = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || !safeEqual(provided, secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  const actorUserId = typeof body?.actorUserId === "string" ? body.actorUserId : "";
  const note = typeof body?.note === "string" ? body.note.slice(0, 500) : undefined;
  if (!orderId || !actorUserId) {
    return Response.json({ error: "orderId e actorUserId são obrigatórios." }, { status: 400 });
  }
  const actor: EscrowActor = { kind: "admin", userId: actorUserId };

  try {
    switch (body?.action) {
      case "release": {
        const order = await releaseOrder(orderId, actor, note ?? "override admin");
        return result(order, "Não foi possível liberar (estado atual não permite).");
      }
      case "hold": {
        const order = await holdOrder(orderId, actor, note ?? "override admin");
        return result(order, "Não dá para reter: pedido já sacado, reembolsado ou já retido.");
      }
      case "refund": {
        const order = await refundPhysicalOrder(orderId, "admin", actor, note);
        return result(
          order?.fulfillmentStatus === "refunded" || order?.fulfillmentStatus === "refund_pending"
            ? order
            : null,
          "Não foi possível reembolsar (estado atual não permite)."
        );
      }
      case "adjust": {
        const amountCents = Math.round(Number(body?.amountCents));
        if (!Number.isFinite(amountCents) || amountCents === 0) {
          return Response.json({ error: "Valor do ajuste inválido." }, { status: 400 });
        }
        const order = await getOrderRepository().getById(orderId);
        if (!order) return Response.json({ error: "Pedido não encontrado." }, { status: 404 });
        await recordShippingAdjustment({
          order,
          kind: "carrier_divergence",
          amountCents,
          chargedTo: "creator",
          note: note ?? "Divergência de medidas cobrada pela transportadora.",
          createdBy: actorUserId,
        });
        return Response.json({ ok: true });
      }
      default:
        return Response.json({ error: "Ação inválida." }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha na ação.";
    return Response.json({ error: message }, { status: 500 });
  }
}

function result(order: { fulfillmentStatus: string } | null, errorMessage: string) {
  if (!order) return Response.json({ error: errorMessage }, { status: 409 });
  return Response.json({ ok: true, fulfillmentStatus: order.fulfillmentStatus });
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
