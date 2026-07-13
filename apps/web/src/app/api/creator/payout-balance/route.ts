import { createSupabaseServerClient } from "@vippin/supabase/client/server";
import { getCreatorPayoutBalance } from "@/lib/payments/creator-withdraw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const server = await createSupabaseServerClient();
  const {
    data: { user },
  } = await server.auth.getUser();

  if (!user) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: profile } = await server
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "consumer") {
    return Response.json({ error: "Acesso negado." }, { status: 403 });
  }

  const balance = await getCreatorPayoutBalance(user.id);
  return Response.json(balance);
}
