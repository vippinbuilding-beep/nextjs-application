import "server-only";

import type { EscrowConfig } from "@vippin/core/domain/fulfillment";
import type { PfLimits } from "@vippin/core/domain/pf-limit";
import { DEFAULT_RETURN_WINDOW_DAYS } from "@vippin/core/domain/returns";
import type { DocumentRuleOptions } from "@vippin/core/domain/seller-profile";
import type { SaleFeeConfig } from "@vippin/core/domain/shipping";
import {
  ABACATEPAY_PIX_SEND_FEE_CENTS,
  PLATFORM_FEE_RATE,
} from "@/lib/payments/platform-fee";

/**
 * Server-side configuration of the physical-products flow (env-driven).
 *
 * PREPARE_DEADLINE_DAYS        dias para o criador preparar o envio (default 5)
 * POST_DEADLINE_DAYS           dias para postar após imprimir (default 6; ME: 7)
 * ESCROW_AUTORELEASE_DAYS      mínimo de dias pós-postagem p/ auto-liberar (14)
 * ESCROW_AUTORELEASE_EXTRA_DAYS folga sobre o prazo da transportadora (7)
 * ESCROW_DISPUTE_BUFFER_DAYS   dias após a entrega antes de liberar (7, prazo do arrependimento)
 * RETURN_WINDOW_DAYS           dias após a entrega para pedir devolução (7)
 * MIN_CREATOR_NET_CENTS        líquido mínimo do criador com frete grátis (200)
 * MELHOR_ENVIO_LOW_BALANCE_CENTS saldo da Melhor Carteira que dispara alerta (15000)
 * ALLOW_DCE_FOR_SALES          "false" desliga a declaração de conteúdo para todos (kill switch)
 * ALLOW_DCE_FOR_MEI            MEI pode usar DC-e além de NF-e (default true)
 * PF_MONTHLY_ORDER_LIMIT       pedidos físicos pagos/mês de pessoa física (10)
 * PF_MONTHLY_AMOUNT_LIMIT_CENTS valor vendido/mês de pessoa física (200000)
 * PF_LIMIT_WARNING_PERCENT     % do limite que dispara o aviso de formalização (80)
 * MELHOR_ENVIO_SERVICE_IDS     allowlist de serviços "1,2,17" (vazio = só Correios: PAC, SEDEX, Mini Envios)
 * PHYSICAL_PRODUCTS_CREATOR_IDS allowlist de criadores (vazio = todos)
 * NEXT_PUBLIC_SITE_URL         usado nos links impressos na etiqueta
 */

function intEnv(name: string, fallback: number, min = 0): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= min ? parsed : fallback;
}

function listEnv(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const SALE_FEE_CONFIG: SaleFeeConfig = {
  saleFixedFeeCents: ABACATEPAY_PIX_SEND_FEE_CENTS,
  platformFeeRate: PLATFORM_FEE_RATE,
};

export const ESCROW_CONFIG: EscrowConfig = {
  prepareDeadlineDays: intEnv("PREPARE_DEADLINE_DAYS", 5, 1),
  postDeadlineDays: intEnv("POST_DEADLINE_DAYS", 6, 1),
  autoReleaseMinDays: intEnv("ESCROW_AUTORELEASE_DAYS", 14, 1),
  autoReleaseExtraDays: intEnv("ESCROW_AUTORELEASE_EXTRA_DAYS", 7, 0),
  disputeBufferDays: intEnv("ESCROW_DISPUTE_BUFFER_DAYS", DEFAULT_RETURN_WINDOW_DAYS, 0),
};

/**
 * Days after delivery the buyer may ask to return (arrependimento). The escrow
 * buffer must cover it, otherwise the creator's share could be released first.
 */
export const RETURN_WINDOW_DAYS = intEnv("RETURN_WINDOW_DAYS", DEFAULT_RETURN_WINDOW_DAYS, 1);

export const PF_LIMITS: PfLimits = {
  maxOrders: intEnv("PF_MONTHLY_ORDER_LIMIT", 10, 1),
  maxAmountCents: intEnv("PF_MONTHLY_AMOUNT_LIMIT_CENTS", 200_000, 1),
  warningRatio: Math.min(intEnv("PF_LIMIT_WARNING_PERCENT", 80, 1), 100) / 100,
};

export const MIN_CREATOR_NET_CENTS = intEnv("MIN_CREATOR_NET_CENTS", 200, 0);

/** Below this Melhor Carteira balance the daily cron alerts the team. */
export const LOW_BALANCE_CENTS = intEnv("MELHOR_ENVIO_LOW_BALANCE_CENTS", 15_000, 0);

/** Inputs of `allowedDocumentTypes` (per-profile DC-e/NF-e rules). */
export function documentRuleOptions(): DocumentRuleOptions {
  return {
    dceEnabled: process.env.ALLOW_DCE_FOR_SALES !== "false",
    allowDceForMei: process.env.ALLOW_DCE_FOR_MEI !== "false",
  };
}

/** Correios only at launch: PAC (1), SEDEX (2), Mini Envios (17). */
export const DEFAULT_SERVICE_IDS = [1, 2, 17] as const;

export function allowedServiceIds(): number[] {
  const fromEnv = listEnv("MELHOR_ENVIO_SERVICE_IDS")
    .map((id) => Number.parseInt(id, 10))
    .filter((id) => Number.isFinite(id));
  return fromEnv.length > 0 ? fromEnv : [...DEFAULT_SERVICE_IDS];
}

/** Rollout gate: empty allowlist = every creator can sell physical products. */
export function canSellPhysical(creatorId: string): boolean {
  const allow = listEnv("PHYSICAL_PRODUCTS_CREATOR_IDS");
  return allow.length === 0 || allow.includes(creatorId);
}

export function siteUrl(path = ""): string | null {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return base ? `${base}${path}` : null;
}

/** Reference CEPs for the creator's freight simulator (product form). */
export const REFERENCE_DESTINATIONS = [
  { label: "São Paulo (SP)", postalCode: "01310100" },
  { label: "Rio de Janeiro (RJ)", postalCode: "20040020" },
  { label: "Porto Alegre (RS)", postalCode: "90010150" },
  { label: "Manaus (AM)", postalCode: "69005070" },
] as const;
