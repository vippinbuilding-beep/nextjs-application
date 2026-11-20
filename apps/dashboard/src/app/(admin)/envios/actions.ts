"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@vippin/supabase/client/server";

export interface EscrowActionState {
  ok?: boolean;
  error?: string;
}

/**
 * Admin overrides of the physical-order escrow. The rules live in apps/web
 * (`/api/admin/escrow`); we forward the action with the shared server secret
 * and the admin's user id (recorded as the author in the audit trail).
 * The middleware already guarantees the caller is in `admin_users`.
 */
export async function runEscrowAction(
  _prev: EscrowActionState,
  formData: FormData
): Promise<EscrowActionState> {
  const webUrl = process.env.WEB_APP_URL?.replace(/\/$/, "");
  const secret = process.env.ADMIN_API_SECRET;
  if (!webUrl || !secret) {
    return { error: "Configure WEB_APP_URL e ADMIN_API_SECRET no dashboard." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const action = String(formData.get("action") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  const note = String(formData.get("note") ?? "").trim() || undefined;
  const amountReais = String(formData.get("amount") ?? "").replace(",", ".");
  const amountCents = amountReais ? Math.round(Number.parseFloat(amountReais) * 100) : undefined;

  try {
    const res = await fetch(`${webUrl}/api/admin/escrow`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${secret}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ action, orderId, note, amountCents, actorUserId: user.id }),
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return { error: body.error ?? `Falha (${res.status}).` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Falha de rede." };
  }

  revalidatePath("/envios");
  return { ok: true };
}
