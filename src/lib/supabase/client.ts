import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Supabase browser client singleton.
 *
 * Uses `@supabase/ssr`, which stores the auth session in cookies (shared with
 * the server) instead of `localStorage`. This lets the middleware refresh the
 * session and protect routes on the server.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
