import type { NextRequest } from "next/server";

import { retryFailedTransfers } from "@/lib/payments/retry-transfers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  return request.nextUrl.searchParams.get("secret") === secret;
}

/**
 * Cron worker: retries failed AbacatePay PIX transfers (order repass, Me Pergunte
 * repass and refunds).
 *
 * Schedule via Vercel Cron (see `vercel.json`) or call manually:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *     https://<domain>/api/cron/retry-transfers
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await retryFailedTransfers();

  return Response.json(summary);
}

export async function POST(request: NextRequest) {
  return GET(request);
}
