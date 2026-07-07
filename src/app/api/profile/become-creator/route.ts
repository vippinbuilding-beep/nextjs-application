import {
  resolveProfileRole,
  updateProfileForUser,
  type ProfileWriteInput,
} from "@/lib/profile/profile-write-server";
import { getProfileByUserId } from "@/lib/profile/server-profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Converts a consumer account to creator and resets onboarding for creator setup. */
export async function POST() {
  const server = await createSupabaseServerClient();
  const {
    data: { user },
  } = await server.auth.getUser();

  if (!user) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const existing = await getProfileByUserId(user.id);
  if (!existing) {
    return Response.json({ error: "Perfil não encontrado." }, { status: 404 });
  }

  if (resolveProfileRole(existing.role) !== "consumer") {
    return Response.json(
      { error: "Sua conta já é de criador." },
      { status: 400 }
    );
  }

  const updates: ProfileWriteInput = {
    role: "creator",
    onboardingCompleted: false,
  };

  if (!existing.creator_name?.trim() && existing.consumer_name?.trim()) {
    updates.creatorName = existing.consumer_name.trim();
  }

  try {
    await updateProfileForUser(user.id, updates);
    return Response.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao atualizar perfil.";
    return Response.json({ error: message }, { status: 500 });
  }
}
