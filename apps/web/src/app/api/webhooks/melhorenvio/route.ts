import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

import { applyTrackingUpdate } from "@/lib/shipping/sync-tracking";
import { getShipmentRepository } from "@vippin/supabase/factories/shipping-factory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Melhor Envio webhook (order.posted, order.delivered, order.cancelled, ...).
 *
 * Security: `X-ME-Signature` = HMAC-SHA256(raw body, app secret)
 * (`MELHOR_ENVIO_WEBHOOK_SECRET`). Accepts hex or base64 encodings. The cron
 * sync stays the source of reconciliation; this only makes updates faster.
 * Webhooks only fire for labels created by the registered application.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.MELHOR_ENVIO_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "Not configured" }, { status: 503 });

  const raw = await request.text();
  const provided = request.headers.get("x-me-signature") ?? "";
  if (!isValidSignature(raw, provided, secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { event?: string; data?: Record<string, unknown> };
  try {
    payload = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const data = payload.data ?? {};
  const labelId = typeof data.id === "string" ? data.id : null;
  if (!labelId) return Response.json({ received: true });

  const shipment = await getShipmentRepository().getByProviderOrderId(labelId);
  if (!shipment) return Response.json({ received: true });

  const status =
    typeof data.status === "string"
      ? data.status
      : (payload.event ?? "").replace(/^order\./, "");

  try {
    await applyTrackingUpdate(shipment, {
      id: labelId,
      status,
      trackingCode: typeof data.tracking === "string" ? data.tracking : undefined,
      trackingUrl: typeof data.tracking_url === "string" ? data.tracking_url : undefined,
      postedAt: parseDate(data.posted_at),
      deliveredAt: parseDate(data.delivered_at),
      canceledAt: parseDate(data.canceled_at),
      expiredAt: parseDate(data.expired_at),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed";
    return Response.json({ error: message }, { status: 500 });
  }

  return Response.json({ received: true });
}

function isValidSignature(raw: string, provided: string, secret: string): boolean {
  if (!provided) return false;
  const digest = createHmac("sha256", secret).update(raw).digest();
  const candidates = [digest.toString("hex"), digest.toString("base64")];
  return candidates.some((expected) => {
    const a = Buffer.from(expected);
    const b = Buffer.from(provided.trim());
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || !value) return undefined;
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? `${value.replace(" ", "T")}-03:00`
    : value;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
