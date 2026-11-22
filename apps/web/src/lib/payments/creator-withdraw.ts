import "server-only";

import { randomUUID } from "crypto";

import type { PixKeyType } from "@vippin/core/models/user";
import { SupabaseAskMeQuestionRepository } from "@vippin/supabase/infrastructure/supabase/supabase-ask-me-repository";
import {
  notifyCreatorWithdrawFailed,
  notifyCreatorWithdrawSent,
} from "@/lib/notifications/dispatch";
import {
  CREATOR_MIN_WITHDRAWAL_CENTS,
  creatorWithdrawNetCents,
  pixSendGrossCents,
} from "@/lib/payments/split";
import { createSupabaseAdminClient } from "@vippin/supabase/client/admin";
import { getOrderRepository, getPaymentGateway } from "@vippin/supabase/factories/payment-factory";

/** AbacatePay `/pix/send` minimum transfer amount (R$ 1,00). */
const ABACATE_MIN_SEND_CENTS = 100;

export interface CreatorPayoutBalance {
  /** Soma das partes do criador após taxas da venda/pergunta (antes da taxa PIX do saque). */
  accruedCents: number;
  /** Produtos físicos ainda em retenção (aguardando entrega). */
  heldCents: number;
  heldCount: number;
  /** Ajustes de frete cobrados do criador, descontados no próximo saque. */
  adjustmentsCents: number;
  /** Líquido que cai no PIX no saque (acumulado − R$ 0,80 de taxa PIX). */
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
  adjustmentIds: string[];
  accruedCents: number;
  withdrawNetCents: number;
}

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

/** Open freight adjustments charged to the creator (positive = creator owes). */
async function listOpenCreatorAdjustments(
  admin: AdminClient,
  creatorId: string
): Promise<{ ids: string[]; totalCents: number }> {
  const { data } = await admin
    .from("shipping_adjustments")
    .select("id, amount_cents")
    .eq("creator_id", creatorId)
    .eq("charged_to", "creator")
    .is("settled_at", null);
  const rows = (data ?? []) as { id: string; amount_cents: number }[];
  return {
    ids: rows.map((row) => row.id),
    totalCents: Math.max(0, rows.reduce((sum, row) => sum + row.amount_cents, 0)),
  };
}

function sumAccruedCents(
  orders: { creatorAmountCents: number }[],
  questions: { creatorAmountCents: number }[]
): number {
  return (
    orders.reduce((sum, o) => sum + o.creatorAmountCents, 0) +
    questions.reduce((sum, q) => sum + q.creatorAmountCents, 0)
  );
}

export async function getCreatorPayoutBalance(
  creatorId: string
): Promise<CreatorPayoutBalance> {
  const admin = createSupabaseAdminClient();
  const orderRepo = getOrderRepository();
  const askMeRepo = new SupabaseAskMeQuestionRepository(admin);

  const [orders, questions, profile, held, adjustments] = await Promise.all([
    orderRepo.listPendingCreatorRepassesByCreator(creatorId),
    askMeRepo.listPendingCreatorRepassesByCreator(creatorId),
    admin
      .from("profiles")
      .select("pix_key, pix_key_type")
      .eq("id", creatorId)
      .maybeSingle(),
    orderRepo.listHeldByCreator(creatorId),
    listOpenCreatorAdjustments(admin, creatorId),
  ]);

  const accruedCents = Math.max(
    0,
    sumAccruedCents(orders, questions) - adjustments.totalCents
  );
  const netCents = creatorWithdrawNetCents(accruedCents);
  const hasPixKey = Boolean(profile.data?.pix_key && profile.data?.pix_key_type);

  return {
    accruedCents,
    heldCents: held.reduce((sum, order) => sum + order.creatorAmountCents, 0),
    heldCount: held.length,
    adjustmentsCents: adjustments.totalCents,
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
 * in a single PIX transfer. Creator receives the full accrued share.
 */
export async function withdrawCreatorPayout(
  creatorId: string
): Promise<CreatorWithdrawResult> {
  const admin = createSupabaseAdminClient();
  const orderRepo = getOrderRepository();
  const askMeRepo = new SupabaseAskMeQuestionRepository(admin);
  const gateway = getPaymentGateway();

  const [orders, questions, adjustments] = await Promise.all([
    orderRepo.listPendingCreatorRepassesByCreator(creatorId),
    askMeRepo.listPendingCreatorRepassesByCreator(creatorId),
    listOpenCreatorAdjustments(admin, creatorId),
  ]);

  const accruedCents = Math.max(
    0,
    sumAccruedCents(orders, questions) - adjustments.totalCents
  );
  const withdrawNetCents = creatorWithdrawNetCents(accruedCents);

  const batch: CreatorBatch = {
    orderIds: orders.map((o) => o.id),
    askMeQuestionIds: questions.map((q) => q.id),
    adjustmentIds: adjustments.ids,
    accruedCents,
    withdrawNetCents,
  };

  if (batch.orderIds.length === 0 && batch.askMeQuestionIds.length === 0) {
    return { ok: false, error: "Nenhum repasse pendente." };
  }

  if (batch.withdrawNetCents < CREATOR_MIN_WITHDRAWAL_CENTS) {
    return {
      ok: false,
      error: `Saldo mínimo para saque: R$ ${(CREATOR_MIN_WITHDRAWAL_CENTS / 100).toFixed(2).replace(".", ",")}.`,
    };
  }

  if (batch.withdrawNetCents < ABACATE_MIN_SEND_CENTS) {
    return {
      ok: false,
      error: "Valor do saque abaixo do mínimo da AbacatePay (R$ 1,00).",
    };
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
      amountCents: pixSendGrossCents(batch.withdrawNetCents),
      externalId: `withdraw-${creatorId}-${randomUUID()}`,
      description: "Saque Vippin",
      pixKey: profile.pix_key,
      pixKeyType: profile.pix_key_type.toUpperCase() as PixKeyType,
    });

    await markCreatorBatchSent(admin, batch, transfer.id);

    await notifyCreatorWithdrawSent({
      creatorId,
      netCents: batch.withdrawNetCents,
      orderCount: batch.orderIds.length,
      askMeCount: batch.askMeQuestionIds.length,
    });

    return {
      ok: true,
      netCents: batch.withdrawNetCents,
      orderCount: batch.orderIds.length,
      askMeCount: batch.askMeQuestionIds.length,
      abacateTransferId: transfer.id,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha no saque PIX.";
    await markCreatorBatchFailed(admin, batch, message);
    await notifyCreatorWithdrawFailed({
      creatorId,
      netCents: batch.withdrawNetCents,
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

  if (batch.adjustmentIds.length > 0) {
    const { error } = await admin
      .from("shipping_adjustments")
      .update({ settled_at: new Date().toISOString() })
      .in("id", batch.adjustmentIds)
      .is("settled_at", null);
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
