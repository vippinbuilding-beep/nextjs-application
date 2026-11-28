import type { NextRequest } from "next/server";

import { finalizeAskMeQuestion } from "@/lib/payments/ask-me-finalize";
import { finalizeOrder } from "@/lib/payments/finalize";
import { isAbacatePayDevMode } from "@vippin/supabase/infrastructure/abacatepay/abacatepay-dev";
import { createSupabaseAdminClient } from "@vippin/supabase/client/admin";
import { createSupabaseServerClient } from "@vippin/supabase/client/server";
import { getPaymentGateway } from "@vippin/supabase/factories/payment-factory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dev-only: simulates the PIX payment of a pending charge.
 *
 * AbacatePay Dev-mode charges are never paid by a real bank transfer — they stay
 * `PENDING` until `/transparents/simulate-payment` is called. This route lets the
 * buyer trigger that from the QR modal so checkout flows are testable.
 *
 * Disabled (404) unless `isAbacatePayDevMode()` — i.e. `NODE_ENV=development` or
 * `ABACATEPAY_DEV_MODE=true`. Only the charge's own payer may simulate it, and
 * the order is still finalized through the normal path (which re-checks the
 * charge status with AbacatePay).
 */

type Kind = "order" | "ask_me";

/** Lets the client know whether to render the simulate button. */
export async function GET() {
  return Response.json({ enabled: isAbacatePayDevMode() });
}

export async function POST(request: NextRequest) {
  if (!isAbacatePayDevMode()) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const server = await createSupabaseServerClient();
  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    kind?: unknown;
    id?: unknown;
  } | null;
  const kind = body?.kind;
  const id = body?.id;
  if ((kind !== "order" && kind !== "ask_me") || typeof id !== "string" || !id) {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const chargeId = await resolvePendingChargeId(kind, id, user.id);
  if (!chargeId) {
    return Response.json(
      { error: "Cobrança pendente não encontrada." },
      { status: 404 }
    );
  }

  try {
    await getPaymentGateway().simulatePixPayment(chargeId);
    if (kind === "order") {
      await finalizeOrder(id);
    } else {
      await finalizeAskMeQuestion(id);
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Falha ao simular o pagamento.";
    return Response.json({ error: message }, { status: 502 });
  }

  return Response.json({ simulated: true });
}

async function resolvePendingChargeId(
  kind: Kind,
  id: string,
  userId: string
): Promise<string | null> {
  const admin = createSupabaseAdminClient();

  if (kind === "order") {
    const { data } = await admin
      .from("orders")
      .select("abacate_charge_id")
      .eq("id", id)
      .eq("buyer_id", userId)
      .eq("status", "pending")
      .maybeSingle();
    return data?.abacate_charge_id ?? null;
  }

  const { data } = await admin
    .from("ask_me_questions")
    .select("abacate_charge_id")
    .eq("id", id)
    .eq("asker_id", userId)
    .eq("status", "pending_payment")
    .maybeSingle();
  return data?.abacate_charge_id ?? null;
}
