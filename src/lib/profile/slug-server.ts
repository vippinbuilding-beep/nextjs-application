import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function slugify(desired: string, fallback: string): string {
  const base = desired
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || fallback;
}

/** Mirrors `private.claim_profile_slug` — server-only, uses service role. */
export async function claimProfileSlug(
  userId: string,
  desired: string
): Promise<string> {
  const admin = createSupabaseAdminClient();
  const base = slugify(desired, "criador");
  let candidate = base;
  let suffix = 1;

  while (true) {
    const { count, error } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("slug", candidate)
      .neq("id", userId);

    if (error) throw new Error(error.message);
    if (!count) return candidate;

    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

/** Mirrors `private.claim_product_slug` — server-only, uses service role. */
export async function claimProductSlug(
  userId: string,
  desired: string
): Promise<string> {
  const admin = createSupabaseAdminClient();
  const base = slugify(desired, "produto");
  let candidate = base;
  let suffix = 1;

  while (true) {
    const { count, error } = await admin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", userId)
      .eq("slug", candidate);

    if (error) throw new Error(error.message);
    if (!count) return candidate;

    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}
