import "server-only";

import { createSupabaseAdminClient } from "@vippin/supabase/client/admin";

export type ServerProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  name: string | null;
  consumer_name: string | null;
  birth_date: string | null;
  pix_key: string | null;
  pix_key_type: string | null;
  creator_name: string | null;
  slug: string | null;
  socials: Record<string, string> | null;
  onboarding_completed: boolean | null;
  role: string | null;
  avatar_path: string | null;
  avatar_mime: string | null;
  avatar_url: string | null;
  avatar_from_google: boolean | null;
  ask_me_enabled: boolean | null;
  ask_me_price_cents: number | null;
  bio: string | null;
  profile_default_tab: string | null;
  created_at: string | null;
};

/** Full profile row for the given user id (service role, server-only). */
export async function getProfileByUserId(
  userId: string
): Promise<ServerProfileRow | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as ServerProfileRow | null;
}
