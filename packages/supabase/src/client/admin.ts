import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase admin client, backed by the service role key.
 *
 * This client BYPASSES Row Level Security, so it must NEVER be imported from
 * client components or shipped to the browser. The `server-only` import above
 * makes the build fail if that ever happens.
 *
 * It is used exclusively inside Route Handlers to mint short-lived signed URLs
 * (`createSignedUrl` / `createSignedUploadUrl`) for the private `products`
 * bucket, and to read product rows without exposing storage paths to the
 * client.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let cached: SupabaseClient | null = null;

export function createSupabaseAdminClient(): SupabaseClient {
  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable.");
  }
  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Set it in your " +
        "server environment (never expose it to the client)."
    );
  }

  if (cached) return cached;

  cached = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cached;
}
