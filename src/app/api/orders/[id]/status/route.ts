import type { NextRequest } from "next/server";

import { finalizeOrder } from "@/lib/payments/finalize";
import { getOrderRepository } from "@/services/payment-factory";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Polls an order's payment status (called by the buyer's browser while the QR
 * code is on screen). Only the order's buyer may read it. As a side effect it
 * finalizes the order if the provider already confirmed the payment, so access
 * is granted even if the webhook is delayed or never arrives.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const server = await createSupabaseServerClient();
  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const orders = getOrderRepository();
  const existing = await orders.getById(id);
  if (!existing || existing.buyerId !== user.id) {
    return Response.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  const order = (await finalizeOrder(id)) ?? existing;

  return Response.json({
    status: order.status,
    transferStatus: order.transferStatus,
    paid: order.status === "paid",
  });
}
