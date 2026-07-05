import type { NextRequest } from "next/server";

import { finalizeOrder } from "@/lib/payments/finalize";
import { finalizeAskMeQuestion } from "@/lib/payments/ask-me-finalize";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * AbacatePay webhook endpoint.
 *
 * Security model:
 *   1. The per-webhook `webhookSecret` (private, in the query string) must match
 *      our env — this rejects anonymous callers.
 *   2. We NEVER trust the payload's claim that a payment happened. `finalizeOrder`
 *      re-checks the charge status directly with AbacatePay before granting
 *      access or repassing money, so even a forged-but-authenticated request
 *      cannot unlock a product that wasn't actually paid.
 *
 * Configure the endpoint in the dashboard as:
 *   https://<domain>/api/webhooks/abacatepay?webhookSecret=<ABACATEPAY_WEBHOOK_SECRET>
 * subscribed to `transparent.completed` (and optionally refund/transfer events).
 */
export async function POST(request: NextRequest) {
  const expected = process.env.ABACATEPAY_WEBHOOK_SECRET;
  const provided = request.nextUrl.searchParams.get("webhookSecret");
  if (!expected || provided !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = (await request.json()) as WebhookPayload;
  } catch {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const orderId = await resolveOrderId(payload);
  if (orderId) {
    try {
      await finalizeOrder(orderId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Processing failed";
      return Response.json({ error: message }, { status: 500 });
    }
  }

  const askMeQuestionId = await resolveAskMeQuestionId(payload);
  if (askMeQuestionId) {
    try {
      await finalizeAskMeQuestion(askMeQuestionId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Processing failed";
      return Response.json({ error: message }, { status: 500 });
    }
  }

  // Always 200 for events we don't act on (refunds/transfers/etc.), so they
  // aren't retried forever.
  return Response.json({ received: true });
}

interface WebhookPayload {
  event?: string;
  data?: {
    id?: string;
    metadata?: Record<string, unknown>;
    pixQrCode?: { id?: string };
    transaction?: { id?: string };
    [key: string]: unknown;
  };
}

/**
 * Finds our order for the incoming event. Prefers the `orderId` we stamped into
 * the charge metadata; falls back to matching the provider's charge id against
 * `orders.abacate_charge_id`.
 */
async function resolveOrderId(payload: WebhookPayload): Promise<string | null> {
  const data = payload.data ?? {};

  const fromMetadata = data.metadata?.orderId;
  if (typeof fromMetadata === "string" && fromMetadata) return fromMetadata;

  const chargeId =
    data.pixQrCode?.id ?? data.id ?? data.transaction?.id ?? null;
  if (!chargeId) return null;

  const admin = createSupabaseAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id")
    .eq("abacate_charge_id", chargeId)
    .maybeSingle();

  return order?.id ?? null;
}

async function resolveAskMeQuestionId(
  payload: WebhookPayload
): Promise<string | null> {
  const data = payload.data ?? {};

  const fromMetadata = data.metadata?.askMeQuestionId;
  if (typeof fromMetadata === "string" && fromMetadata) return fromMetadata;

  const chargeId =
    data.pixQrCode?.id ?? data.id ?? data.transaction?.id ?? null;
  if (!chargeId) return null;

  const admin = createSupabaseAdminClient();
  const { data: question } = await admin
    .from("ask_me_questions")
    .select("id")
    .eq("abacate_charge_id", chargeId)
    .maybeSingle();

  return question?.id ?? null;
}
