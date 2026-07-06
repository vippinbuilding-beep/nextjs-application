import type { NextRequest } from "next/server";

import { runWeeklyCreatorPayouts } from "@/lib/payments/weekly-creator-payouts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  return request.nextUrl.searchParams.get("secret") === secret;
}

/**
 * Weekly cron: aggregates pending creator repasses (product sales + Me Pergunte)
 * into one PIX per creator, then retries failed ask-me refunds.
 *
 * Schedule via Vercel Cron (see `vercel.json`) or call manually:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *     https://<domain>/api/cron/weekly-creator-payouts
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runWeeklyCreatorPayouts();

  return Response.json(summary);
}

export async function POST(request: NextRequest) {
  return GET(request);
}
