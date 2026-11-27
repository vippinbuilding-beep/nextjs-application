import "server-only";

import type { EscrowConfig } from "@vippin/core/domain/fulfillment";
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
 * ESCROW_DISPUTE_BUFFER_DAYS   dias após a entrega antes de liberar (0)
 * MIN_CREATOR_NET_CENTS        líquido mínimo do criador com frete grátis (200)
 * MELHOR_ENVIO_LOW_BALANCE_CENTS saldo da Melhor Carteira que dispara alerta (15000)
 * ALLOW_DCE_FOR_SALES          permite declaração de conteúdo (default true)
 * MELHOR_ENVIO_SERVICE_IDS     allowlist de serviços "1,2,3,4,17" (vazio = todos)
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
  disputeBufferDays: intEnv("ESCROW_DISPUTE_BUFFER_DAYS", 0, 0),
};

export const MIN_CREATOR_NET_CENTS = intEnv("MIN_CREATOR_NET_CENTS", 200, 0);

/** Below this Melhor Carteira balance the daily cron alerts the team. */
export const LOW_BALANCE_CENTS = intEnv("MELHOR_ENVIO_LOW_BALANCE_CENTS", 15_000, 0);

export function isDceAllowed(): boolean {
  return process.env.ALLOW_DCE_FOR_SALES !== "false";
}

export function allowedServiceIds(): number[] {
  return listEnv("MELHOR_ENVIO_SERVICE_IDS")
    .map((id) => Number.parseInt(id, 10))
    .filter((id) => Number.isFinite(id));
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
