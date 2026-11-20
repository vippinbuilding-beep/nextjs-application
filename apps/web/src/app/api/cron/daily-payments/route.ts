import type { NextRequest } from "next/server";

import { isCronAuthorized } from "@/lib/cron/auth";
import { runAskMeExpirations } from "@/lib/payments/ask-me-finalize";
import { runEscrowJobs } from "@/lib/payments/escrow";
import { runRetryFailedPayments } from "@/lib/payments/retry-failed-payments";
import { runShippingSync } from "@/lib/shipping/sync-tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Daily cron (Hobby-compatible): expires overdue Me Pergunte questions,
 * retries failed PIX refunds/repasses, syncs shipment tracking and applies the
 * physical-product escrow rules. Schedule via vercel.json in UTC.
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [expirations, retries] = await Promise.all([
    runAskMeExpirations(),
    runRetryFailedPayments(),
  ]);

  // Physical products: tracking sync first, then escrow rules (release/refund).
  const tracking = await runShippingSync().catch((err) => ({
    error: err instanceof Error ? err.message : String(err),
  }));
  const escrow = await runEscrowJobs().catch((err) => ({
    error: err instanceof Error ? err.message : String(err),
  }));

  return Response.json({ expirations, retries, tracking, escrow });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
