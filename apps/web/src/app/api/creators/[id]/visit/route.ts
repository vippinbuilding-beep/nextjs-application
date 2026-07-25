import type { NextRequest } from "next/server";

import { normalizeVisitorId, recordProfileVisit } from "@/lib/visits/record-visit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Records an exact (deduplicated per browser) visit to a creator profile.
 * The browser sends the `visitorId` it stores in localStorage; the ledger's
 * unique constraint guarantees the same browser never counts twice.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as
    | { visitorId?: unknown }
    | null;

  const visitorId = normalizeVisitorId(body?.visitorId);
  if (!visitorId) {
    return Response.json({ error: "visitorId inválido." }, { status: 400 });
  }

  try {
    const result = await recordProfileVisit(id, visitorId);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Não foi possível registrar a visita.";
    return Response.json({ error: message }, { status: 400 });
  }
}
