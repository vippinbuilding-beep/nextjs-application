import "server-only";

import { createSupabaseAdminClient } from "@vippin/supabase/client/admin";

/**
 * Registers an exact, deduplicated visit in one of the visit ledgers.
 *
 * Uses the service role (bypasses RLS) to insert `(targetColumn, visitor_id)`
 * with `ignoreDuplicates`, so a browser that already visited this target does
 * not count again. The `visit_count` column stays in sync via DB trigger, so we
 * never do a read-modify-write here.
 *
 * Returns `counted: true` only when a new row was actually inserted.
 */
async function recordVisit(
  table: "profile_visits" | "product_visits",
  targetColumn: "creator_id" | "product_id",
  targetId: string,
  visitorId: string
): Promise<{ counted: boolean }> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from(table)
    .upsert(
      { [targetColumn]: targetId, visitor_id: visitorId },
      { onConflict: `${targetColumn},visitor_id`, ignoreDuplicates: true }
    )
    .select("id");

  if (error) {
    throw new Error(`Não foi possível registrar a visita: ${error.message}`);
  }

  return { counted: (data?.length ?? 0) > 0 };
}

export function recordProfileVisit(
  creatorId: string,
  visitorId: string
): Promise<{ counted: boolean }> {
  return recordVisit("profile_visits", "creator_id", creatorId, visitorId);
}

export function recordProductVisit(
  productId: string,
  visitorId: string
): Promise<{ counted: boolean }> {
  return recordVisit("product_visits", "product_id", productId, visitorId);
}

/**
 * Validates the `visitorId` sent by the browser. Mirrors the DB CHECK
 * (`char_length between 1 and 100`) so a bad payload fails fast with 400.
 */
export function normalizeVisitorId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 100) return null;
  return trimmed;
}
