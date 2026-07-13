import type { NextRequest } from "next/server";

import { claimProfileSlug } from "@/lib/profile/slug-server";
import { resolveProfileRole } from "@/lib/profile/profile-write-server";
import { getProfileByUserId } from "@/lib/profile/server-profile";
import { createSupabaseServerClient } from "@vippin/supabase/client/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ClaimSlugBody {
  desired?: string;
}

/** Atomically resolves an available public profile slug for the caller. */
export async function POST(request: NextRequest) {
  const server = await createSupabaseServerClient();
  const {
    data: { user },
  } = await server.auth.getUser();

  if (!user) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const profile = await getProfileByUserId(user.id);
  if (resolveProfileRole(profile?.role) !== "creator") {
    return Response.json(
      { error: "Apenas criadores podem gerar link público." },
      { status: 403 }
    );
  }

  let body: ClaimSlugBody;
  try {
    body = (await request.json()) as ClaimSlugBody;
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const desired = typeof body.desired === "string" ? body.desired : "";

  try {
    const slug = await claimProfileSlug(user.id, desired);
    return Response.json({ slug });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao gerar slug.";
    return Response.json({ error: message }, { status: 500 });
  }
}
