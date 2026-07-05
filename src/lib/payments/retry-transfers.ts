import "server-only";

import type { AskMeQuestion } from "@/core/models/ask-me-question";
import type { Order } from "@/core/models/order";
import { SupabaseAskMeQuestionRepository } from "@/infrastructure/supabase/supabase-ask-me-repository";
import {
  refundAskMeQuestion,
  repassAskMeToCreator,
} from "@/lib/payments/ask-me-finalize";
import { repassOrderToCreator } from "@/lib/payments/finalize";
import {
  ABACATE_PAY_PIX_SEND_DEV_ERROR,
  isAbacatePayDevMode,
} from "@/lib/payments/abacatepay-dev";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getOrderRepository } from "@/services/payment-factory";

/** Max rows processed per worker run (avoids serverless timeouts). */
export const RETRY_TRANSFERS_BATCH_LIMIT = 20;

/** Minimum time since the last attempt before retrying (backoff). */
export const RETRY_TRANSFERS_MIN_AGE_MS = 5 * 60 * 1000;

/** Errors that won't succeed on retry until the user fixes data on their side. */
const NON_RETRYABLE_ERRORS = new Set([
  "Criador sem chave PIX cadastrada.",
  "Valor do repasse abaixo do mínimo de R$ 1,00.",
  "Chave PIX do perguntador ausente para estorno.",
]);

export interface RetryTransferResult {
  kind: "order_repass" | "ask_me_repass" | "ask_me_refund";
  id: string;
  ok: boolean;
  transferStatus?: string;
  error?: string;
}

export interface RetryTransfersSummary {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  results: RetryTransferResult[];
}

function isRetryable(row: { transferError?: string }): boolean {
  if (!row.transferError) return true;
  if (NON_RETRYABLE_ERRORS.has(row.transferError)) return false;
  // Dev-mode API keys can't send PIX; retry only helps once simulation is on.
  if (
    row.transferError === ABACATE_PAY_PIX_SEND_DEV_ERROR &&
    !isAbacatePayDevMode()
  ) {
    return false;
  }
  return true;
}

function refundReason(question: AskMeQuestion): "declined" | "expired" {
  if (
    question.responseDeadlineAt &&
    question.responseDeadlineAt.getTime() < Date.now()
  ) {
    return "expired";
  }
  return "declined";
}

/**
 * Retries failed AbacatePay `/pix/send` calls for product orders and Me Pergunte
 * (creator repass + asker refunds). Safe to run on a cron schedule.
 */
export async function retryFailedTransfers(
  options: {
    batchLimit?: number;
    minAgeMs?: number;
  } = {}
): Promise<RetryTransfersSummary> {
  const batchLimit = options.batchLimit ?? RETRY_TRANSFERS_BATCH_LIMIT;
  const minAgeMs = options.minAgeMs ?? RETRY_TRANSFERS_MIN_AGE_MS;

  const admin = createSupabaseAdminClient();
  const askMeRepo = new SupabaseAskMeQuestionRepository(admin);
  const orderRepo = getOrderRepository();

  const perKindLimit = Math.max(1, Math.ceil(batchLimit / 3));

  const [orders, askMeRepasses, askMeRefunds] = await Promise.all([
    orderRepo.listFailedRepasses(perKindLimit, minAgeMs),
    askMeRepo.listFailedRepasses(perKindLimit, minAgeMs),
    askMeRepo.listFailedRefunds(perKindLimit, minAgeMs),
  ]);

  const summary: RetryTransfersSummary = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    results: [],
  };

  for (const order of orders) {
    await retryOne(summary, {
      kind: "order_repass",
      id: order.id,
      retryable: isRetryable(order),
      run: () => repassOrderToCreator(order.id),
      getStatus: (result) => (result as Order | null)?.transferStatus,
    });
  }

  for (const question of askMeRepasses) {
    await retryOne(summary, {
      kind: "ask_me_repass",
      id: question.id,
      retryable: isRetryable(question),
      run: () => repassAskMeToCreator(question.id),
      getStatus: (result) => (result as AskMeQuestion | null)?.transferStatus,
    });
  }

  for (const question of askMeRefunds) {
    const reason = refundReason(question);
    await retryOne(summary, {
      kind: "ask_me_refund",
      id: question.id,
      retryable: isRetryable(question),
      run: () => refundAskMeQuestion(question.id, reason),
      getStatus: (result) => (result as AskMeQuestion | null)?.transferStatus,
      successStatus: "refunded",
    });
  }

  return summary;
}

async function retryOne(
  summary: RetryTransfersSummary,
  input: {
    kind: RetryTransferResult["kind"];
    id: string;
    retryable: boolean;
    run: () => Promise<Order | AskMeQuestion | null>;
    getStatus: (result: Order | AskMeQuestion | null) => string | undefined;
    successStatus?: string;
  }
): Promise<void> {
  if (!input.retryable) {
    summary.skipped += 1;
    summary.results.push({
      kind: input.kind,
      id: input.id,
      ok: false,
      error: "Erro permanente — retry ignorado.",
    });
    return;
  }

  summary.processed += 1;

  try {
    const result = await input.run();
    const transferStatus = input.getStatus(result);
    const ok =
      transferStatus === (input.successStatus ?? "sent") ||
      transferStatus === "refunded";

    if (ok) {
      summary.succeeded += 1;
    } else {
      summary.failed += 1;
    }

    summary.results.push({
      kind: input.kind,
      id: input.id,
      ok,
      transferStatus,
      error: result && "transferError" in result ? result.transferError : undefined,
    });
  } catch (err) {
    summary.failed += 1;
    summary.results.push({
      kind: input.kind,
      id: input.id,
      ok: false,
      error: err instanceof Error ? err.message : "Falha inesperada.",
    });
  }
}
