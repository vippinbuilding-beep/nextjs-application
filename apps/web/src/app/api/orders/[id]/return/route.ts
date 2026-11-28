import type { NextRequest } from "next/server";

import { requireRouteUser } from "@/lib/auth/route-auth";
import { ReturnRequestError, requestReturn } from "@/lib/payments/returns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Quero devolver" (arrependimento): the buyer asks to return a delivered
 * physical order within the window. Ownership, window and order state are
 * validated server-side; the escrow is held until an admin resolves it.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRouteUser();
  if (auth.error) return auth.error;
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as { reason?: unknown } | null;
  const reason = typeof body?.reason === "string" ? body.reason : "";

  try {
    const created = await requestReturn({ orderId: id, buyerId: auth.user.id, reason });
    return Response.json({ ok: true, status: created.status });
  } catch (err) {
    if (err instanceof ReturnRequestError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error("[returns] request failed:", err);
    return Response.json(
      { error: "Não foi possível registrar o pedido de devolução. Tente novamente." },
      { status: 500 }
    );
  }
}
