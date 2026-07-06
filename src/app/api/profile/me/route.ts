import type { NextRequest } from "next/server";

import { dispatchProfileWriteNotifications } from "@/lib/notifications/profile-events";
import { sanitizeProfileWriteInput } from "@/lib/profile/profile-write-guards";
import {
  resolveProfileRole,
  updateProfileForUser,
  upsertProfileForUser,
  type ProfileWriteInput,
} from "@/lib/profile/profile-write-server";
import { getProfileByUserId } from "@/lib/profile/server-profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isProfileWriteInput(value: unknown): value is ProfileWriteInput {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Returns the authenticated user's full profile (including PII). */
export async function GET() {
  const server = await createSupabaseServerClient();
  const {
    data: { user },
  } = await server.auth.getUser();

  if (!user) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    return Response.json({ error: "Perfil não encontrado." }, { status: 404 });
  }

  return Response.json(profile);
}

/** Upserts or updates the authenticated user's profile (PII writes, server-only). */
export async function PATCH(request: NextRequest) {
  const server = await createSupabaseServerClient();
  const {
    data: { user },
  } = await server.auth.getUser();

  if (!user) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  if (!isProfileWriteInput(body)) {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  try {
    const existing = await getProfileByUserId(user.id);
    const role = resolveProfileRole(existing?.role);
    const sanitized = sanitizeProfileWriteInput(role, body);

    if (!existing) {
      await upsertProfileForUser(user.id, sanitized);
    } else {
      await updateProfileForUser(user.id, sanitized);
    }

    await dispatchProfileWriteNotifications(
      user.id,
      existing,
      sanitized,
      role
    );

    return Response.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao salvar perfil.";
    const status = message.includes("não podem alterar") ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
}
