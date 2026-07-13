"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@vippin/supabase/client/server";
import { adminUserRepository } from "@vippin/supabase/factories/admin-repository-factory";

import { addAdminEmail } from "@/lib/admin/allowlist";

/**
 * Adiciona o usuário à allowlist `admin_users` (concede acesso ao painel).
 * Ação sensível: qualquer admin autenticado pode chamar (já passou pelo gate
 * do middleware), mas registramos quem fez via `created_by`.
 */
export async function makeUserAdmin(userId: string): Promise<void> {
  const user = await adminUserRepository.getDetail(userId);
  if (!user?.email) {
    throw new Error("Usuário sem e-mail cadastrado — não é possível torná-lo admin.");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: actor },
  } = await supabase.auth.getUser();

  await addAdminEmail(user.email, actor?.email ?? null);

  revalidatePath(`/usuarios/${userId}`);
}
