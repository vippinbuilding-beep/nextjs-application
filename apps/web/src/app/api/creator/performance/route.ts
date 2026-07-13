import { getCreatorPerformance } from "@/lib/creator-dashboard/performance";
import { parseCreatorPerformancePeriod } from "@/lib/creator-dashboard/performance-period";
import { createSupabaseServerClient } from "@vippin/supabase/client/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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

  try {
    const { searchParams } = new URL(request.url);
    const period = parseCreatorPerformancePeriod({
      days: searchParams.get("days"),
      from: searchParams.get("from"),
      to: searchParams.get("to"),
    });
    const snapshot = await getCreatorPerformance(user.id, period);
    return Response.json(snapshot);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Não foi possível carregar o desempenho.";
    return Response.json({ error: message }, { status: 500 });
  }
}
