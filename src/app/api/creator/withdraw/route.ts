import { createSupabaseServerClient } from "@/lib/supabase/server";
import { withdrawCreatorPayout } from "@/lib/payments/creator-withdraw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
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

  const result = await withdrawCreatorPayout(user.id);

  if (!result.ok) {
    return Response.json({ error: result.error ?? "Falha no saque." }, { status: 400 });
  }

  return Response.json({
    ok: true,
    netCents: result.netCents,
    orderCount: result.orderCount,
    askMeCount: result.askMeCount,
    abacateTransferId: result.abacateTransferId,
  });
}
