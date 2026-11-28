/**
 * Monthly volume limit for sellers without CNPJ (pessoa física): DC-e is only
 * defensible for eventual sales, so frequent PF sellers are nudged to
 * formalize as MEI and, at the limit, stop receiving new physical orders until
 * the month turns (Brasília time). Orders already paid are never affected.
 */

export interface PfMonthlyUsage {
  orders: number;
  amountCents: number;
}

export interface PfLimits {
  maxOrders: number;
  maxAmountCents: number;
  /** Fraction of either limit that triggers the warning (e.g. 0.8). */
  warningRatio: number;
}

export type PfLimitStatus = "ok" | "near" | "reached";

export interface PfLimitEvaluation {
  status: PfLimitStatus;
  usage: PfMonthlyUsage;
  limits: PfLimits;
}

export function evaluatePfLimit(usage: PfMonthlyUsage, limits: PfLimits): PfLimitEvaluation {
  const orderRatio = limits.maxOrders > 0 ? usage.orders / limits.maxOrders : 0;
  const amountRatio = limits.maxAmountCents > 0 ? usage.amountCents / limits.maxAmountCents : 0;
  const ratio = Math.max(orderRatio, amountRatio);
  const status: PfLimitStatus = ratio >= 1 ? "reached" : ratio >= limits.warningRatio ? "near" : "ok";
  return { status, usage, limits };
}

/** Brasília has no DST since 2019: a fixed UTC-3 offset. */
const BRT_OFFSET_MS = 3 * 60 * 60 * 1000;

/** First instant of the current month in America/Sao_Paulo, as a UTC Date. */
export function monthStartInSaoPaulo(now: Date = new Date()): Date {
  const local = new Date(now.getTime() - BRT_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) + BRT_OFFSET_MS);
}

export const PF_LIMIT_NEAR_MESSAGE =
  "Você está vendendo com frequência. Formalize como MEI para continuar.";

export const PF_LIMIT_REACHED_MESSAGE =
  "Você atingiu o limite mensal de vendas como pessoa física. Seus produtos físicos voltam a ficar disponíveis no próximo mês, ou antes, se você se formalizar como MEI.";

/** Shown to buyers (quote/checkout) when the seller hit the PF limit. */
export const PF_LIMIT_BUYER_MESSAGE =
  "Este produto está indisponível no momento. Tente novamente mais tarde.";
