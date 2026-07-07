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
    transparent?: {
      id?: string;
      metadata?: Record<string, unknown>;
    };
    pixQrCode?: { id?: string };
    transaction?: { id?: string };
    [key: string]: unknown;
  };
}

/** AbacatePay v2 nests charge data under `data.transparent`; older shapes are kept as fallback. */
function extractTransparentCharge(payload: WebhookPayload): {
  chargeId: string | null;
  metadata: Record<string, unknown>;
} {
  const data = payload.data ?? {};
  const transparent = data.transparent;

  if (transparent && typeof transparent === "object") {
    return {
      chargeId: typeof transparent.id === "string" ? transparent.id : null,
      metadata: transparent.metadata ?? {},
    };
  }

  const chargeId =
    data.pixQrCode?.id ??
    (typeof data.id === "string" ? data.id : null) ??
    data.transaction?.id ??
    null;

  return {
    chargeId: chargeId ?? null,
    metadata: data.metadata ?? {},
  };
}

function metadataString(
  metadata: Record<string, unknown>,
  key: string
): string | null {
  const value = metadata[key];
  return typeof value === "string" && value ? value : null;
}

/**
 * Finds our order for the incoming event. Prefers the `orderId` we stamped into
 * the charge metadata; falls back to matching the provider's charge id against
 * `orders.abacate_charge_id`.
 */
async function resolveOrderId(payload: WebhookPayload): Promise<string | null> {
  const { chargeId, metadata } = extractTransparentCharge(payload);

  const fromMetadata = metadataString(metadata, "orderId");
  if (fromMetadata) return fromMetadata;

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
  const { chargeId, metadata } = extractTransparentCharge(payload);

  const fromMetadata = metadataString(metadata, "askMeQuestionId");
  if (fromMetadata) return fromMetadata;

  if (!chargeId) return null;

  const admin = createSupabaseAdminClient();
  const { data: question } = await admin
    .from("ask_me_questions")
    .select("id")
    .eq("abacate_charge_id", chargeId)
    .maybeSingle();

  return question?.id ?? null;
}
