import type { NextRequest } from "next/server";

import { isCronAuthorized } from "@/lib/cron/auth";
import { runEscrowJobs } from "@/lib/payments/escrow";
import { runShippingSync } from "@/lib/shipping/sync-tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Tracking sync + escrow rules (release on delivery, auto-release, refunds on
 * missed deadlines). Also runs inside the daily cron; schedule this one more
 * often (e.g. hourly) on a Vercel plan that allows it, or via an external cron
 * with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tracking = await runShippingSync();
  const escrow = await runEscrowJobs();
  return Response.json({ tracking, escrow });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
