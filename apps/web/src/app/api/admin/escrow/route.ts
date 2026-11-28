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
import { getOrderReturnRepository } from "@vippin/supabase/factories/shipping-factory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Internal endpoint for the admin dashboard's escrow overrides (liberar /
 * reter / reembolsar / ajuste de frete) and buyer returns (recusar devolução,
 * cobrar o frete da devolução do criador). Keeps a single implementation of the
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
        const returns = getOrderReturnRepository();
        const openReturn = await returns.getByOrderId(orderId);
        if (openReturn?.status === "open") {
          return Response.json(
            { error: "Há uma devolução aberta: use Reembolsar ou Recusar devolução." },
            { status: 409 }
          );
        }
        const order = await releaseOrder(orderId, actor, note ?? "override admin");
        return result(order, "Não foi possível liberar (estado atual não permite).");
      }
      case "reject_return": {
        if (!note?.trim()) {
          return Response.json(
            { error: "Informe o motivo da recusa (fica na auditoria)." },
            { status: 400 }
          );
        }
        const rejected = await getOrderReturnRepository().resolve(
          orderId,
          "rejected",
          actorUserId,
          note
        );
        if (!rejected) {
          return Response.json({ error: "Não há devolução aberta neste pedido." }, { status: 409 });
        }
        const order = await releaseOrder(orderId, actor, `devolução recusada: ${note}`);
        return result(
          order ?? (await getOrderRepository().getById(orderId)),
          "Devolução recusada, mas não foi possível liberar o repasse."
        );
      }
      case "charge_return": {
        const amountCents = Math.round(Number(body?.amountCents));
        if (!Number.isFinite(amountCents) || amountCents <= 0) {
          return Response.json({ error: "Valor do frete da devolução inválido." }, { status: 400 });
        }
        const order = await getOrderRepository().getById(orderId);
        if (!order) return Response.json({ error: "Pedido não encontrado." }, { status: 404 });
        await recordShippingAdjustment({
          order,
          kind: "return_cost",
          amountCents,
          chargedTo: "creator",
          note: note ?? "Frete da devolução (arrependimento) cobrado do criador.",
          createdBy: actorUserId,
        });
        return Response.json({ ok: true });
      }
      case "hold": {
        const order = await holdOrder(orderId, actor, note ?? "override admin");
        return result(order, "Não dá para reter: pedido já sacado, reembolsado ou já retido.");
      }
      case "refund": {
        const returns = getOrderReturnRepository();
        const openReturn = (await returns.getByOrderId(orderId))?.status === "open";
        const order = await refundPhysicalOrder(
          orderId,
          openReturn ? "buyer_return" : "admin",
          actor,
          note
        );
        if (
          openReturn &&
          (order?.fulfillmentStatus === "refunded" || order?.fulfillmentStatus === "refund_pending")
        ) {
          await returns.resolve(orderId, "refunded", actorUserId, note);
        }
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
