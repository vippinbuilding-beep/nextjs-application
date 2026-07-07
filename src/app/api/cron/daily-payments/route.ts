import type { NextRequest } from "next/server";

import { isCronAuthorized } from "@/lib/cron/auth";
import { runAskMeExpirations } from "@/lib/payments/ask-me-finalize";
import { runRetryFailedPayments } from "@/lib/payments/retry-failed-payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Daily cron (Hobby-compatible): expires overdue Me Pergunte questions and
 * retries failed PIX refunds/repasses. Schedule via vercel.json in UTC.
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [expirations, retries] = await Promise.all([
    runAskMeExpirations(),
    runRetryFailedPayments(),
  ]);

  return Response.json({ expirations, retries });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
