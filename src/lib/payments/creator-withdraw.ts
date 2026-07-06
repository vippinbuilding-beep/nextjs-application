import "server-only";

import { randomUUID } from "crypto";

import type { PixKeyType } from "@/core/models/user";
import { SupabaseAskMeQuestionRepository } from "@/infrastructure/supabase/supabase-ask-me-repository";
import {
  notifyCreatorWithdrawFailed,
  notifyCreatorWithdrawSent,
} from "@/lib/notifications/dispatch";
import {
  CREATOR_MIN_WITHDRAWAL_CENTS,
  pixSendGrossCents,
} from "@/lib/payments/split";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getOrderRepository, getPaymentGateway } from "@/services/payment-factory";

/** AbacatePay `/pix/send` minimum transfer amount (R$ 1,00). */
const ABACATE_MIN_SEND_CENTS = 100;

export interface CreatorPayoutBalance {
  netCents: number;
  orderCount: number;
  askMeCount: number;
  minWithdrawalCents: number;
  canWithdraw: boolean;
  hasPixKey: boolean;
}

export interface CreatorWithdrawResult {
  ok: boolean;
  netCents?: number;
  orderCount?: number;
  askMeCount?: number;
  abacateTransferId?: string;
  error?: string;
}

interface CreatorBatch {
  orderIds: string[];
  askMeQuestionIds: string[];
  netCents: number;
}

export async function getCreatorPayoutBalance(
  creatorId: string
): Promise<CreatorPayoutBalance> {
  const admin = createSupabaseAdminClient();
  const orderRepo = getOrderRepository();
  const askMeRepo = new SupabaseAskMeQuestionRepository(admin);

  const [orders, questions, profile] = await Promise.all([
    orderRepo.listPendingCreatorRepassesByCreator(creatorId),
    askMeRepo.listPendingCreatorRepassesByCreator(creatorId),
    admin
      .from("profiles")
      .select("pix_key, pix_key_type")
      .eq("id", creatorId)
      .maybeSingle(),
  ]);

  const netCents =
    orders.reduce((sum, o) => sum + o.creatorAmountCents, 0) +
    questions.reduce((sum, q) => sum + q.creatorAmountCents, 0);

  const hasPixKey = Boolean(profile.data?.pix_key && profile.data?.pix_key_type);

  return {
    netCents,
    orderCount: orders.length,
    askMeCount: questions.length,
    minWithdrawalCents: CREATOR_MIN_WITHDRAWAL_CENTS,
    canWithdraw: hasPixKey && netCents >= CREATOR_MIN_WITHDRAWAL_CENTS,
    hasPixKey,
  };
}

/**
 * Withdraws all pending creator earnings (product sales + answered Me Pergunte)
 * in a single PIX transfer. Requires net balance >= R$ 20,00.
 */
export async function withdrawCreatorPayout(
  creatorId: string
): Promise<CreatorWithdrawResult> {
  const admin = createSupabaseAdminClient();
  const orderRepo = getOrderRepository();
  const askMeRepo = new SupabaseAskMeQuestionRepository(admin);
  const gateway = getPaymentGateway();

  const [orders, questions] = await Promise.all([
    orderRepo.listPendingCreatorRepassesByCreator(creatorId),
    askMeRepo.listPendingCreatorRepassesByCreator(creatorId),
  ]);

  const batch: CreatorBatch = {
    orderIds: orders.map((o) => o.id),
    askMeQuestionIds: questions.map((q) => q.id),
    netCents:
      orders.reduce((sum, o) => sum + o.creatorAmountCents, 0) +
      questions.reduce((sum, q) => sum + q.creatorAmountCents, 0),
  };

  if (batch.netCents < CREATOR_MIN_WITHDRAWAL_CENTS) {
    return {
      ok: false,
      error: `Saldo mínimo para saque: R$ ${(CREATOR_MIN_WITHDRAWAL_CENTS / 100).toFixed(2).replace(".", ",")}.`,
    };
  }

  if (batch.netCents < ABACATE_MIN_SEND_CENTS) {
    return {
      ok: false,
      error: "Valor do saque abaixo do mínimo da AbacatePay (R$ 1,00).",
    };
  }

  if (batch.orderIds.length === 0 && batch.askMeQuestionIds.length === 0) {
    return { ok: false, error: "Nenhum repasse pendente." };
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("pix_key, pix_key_type")
    .eq("id", creatorId)
    .maybeSingle();

  if (profileError || !profile?.pix_key || !profile.pix_key_type) {
    const message = "Cadastre sua chave PIX em Editar perfil antes de sacar.";
    return { ok: false, error: message };
  }

  try {
    const transfer = await gateway.sendPix({
      amountCents: pixSendGrossCents(batch.netCents),
      externalId: `withdraw-${creatorId}-${randomUUID()}`,
      description: "Saque Vippin",
      pixKey: profile.pix_key,
      pixKeyType: profile.pix_key_type.toUpperCase() as PixKeyType,
    });

    await markCreatorBatchSent(admin, batch, transfer.id);

    await notifyCreatorWithdrawSent({
      creatorId,
      netCents: batch.netCents,
      orderCount: batch.orderIds.length,
      askMeCount: batch.askMeQuestionIds.length,
    });

    return {
      ok: true,
      netCents: batch.netCents,
      orderCount: batch.orderIds.length,
      askMeCount: batch.askMeQuestionIds.length,
      abacateTransferId: transfer.id,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha no saque PIX.";
    await markCreatorBatchFailed(admin, batch, message);
    await notifyCreatorWithdrawFailed({
      creatorId,
      netCents: batch.netCents,
      orderCount: batch.orderIds.length,
      askMeCount: batch.askMeQuestionIds.length,
      error: message,
    });
    return { ok: false, error: message };
  }
}

async function markCreatorBatchSent(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  batch: CreatorBatch,
  transferId: string
): Promise<void> {
  const patch = {
    transfer_status: "sent",
    abacate_transfer_id: transferId,
    transfer_error: null,
  };

  if (batch.orderIds.length > 0) {
    const { error } = await admin
      .from("orders")
      .update(patch)
      .in("id", batch.orderIds);
    if (error) throw new Error(error.message);
  }

  if (batch.askMeQuestionIds.length > 0) {
    const { error } = await admin
      .from("ask_me_questions")
      .update(patch)
      .in("id", batch.askMeQuestionIds);
    if (error) throw new Error(error.message);
  }
}

async function markCreatorBatchFailed(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  batch: CreatorBatch,
  message: string
): Promise<void> {
  const patch = {
    transfer_status: "failed",
    transfer_error: message,
  };

  if (batch.orderIds.length > 0) {
    await admin.from("orders").update(patch).in("id", batch.orderIds);
  }
  if (batch.askMeQuestionIds.length > 0) {
    await admin
      .from("ask_me_questions")
      .update(patch)
      .in("id", batch.askMeQuestionIds);
  }
}
