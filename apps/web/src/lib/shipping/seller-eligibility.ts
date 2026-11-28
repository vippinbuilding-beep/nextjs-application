import "server-only";

import {
  evaluatePfLimit,
  monthStartInSaoPaulo,
  PF_LIMIT_BUYER_MESSAGE,
  type PfLimitEvaluation,
} from "@vippin/core/domain/pf-limit";
import { SELLER_TERMS_VERSION } from "@vippin/core/domain/seller-terms";
import {
  allowedDocumentTypes,
  type SellerProfile,
} from "@vippin/core/domain/seller-profile";
import type { ShipmentDocumentType } from "@vippin/core/models/shipment";
import type { ShipFromAddress } from "@vippin/core/models/shipping";
import { canSellPhysical, documentRuleOptions, PF_LIMITS } from "@/lib/shipping/config";
import { effectiveSellerProfile, getShipFrom } from "@/lib/shipping/ship-from";
import { getOrderRepository } from "@vippin/supabase/factories/payment-factory";
import { getServerSellerTermsRepository } from "@vippin/supabase/factories/shipping-factory";

export type SellerBlockReason =
  | "not_enabled"
  | "no_ship_from"
  | "terms_not_accepted"
  | "no_document_type"
  | "pf_limit_reached";

export interface SellerEligibility {
  /** True when a NEW physical sale may happen (quote/checkout). */
  canSell: boolean;
  /** Why not (`canSell` false). */
  blockReason?: SellerBlockReason;
  shipFrom: ShipFromAddress | null;
  profile: SellerProfile | null;
  termsAccepted: boolean;
  /** Documents the label may carry for this seller. */
  allowedDocumentTypes: ShipmentDocumentType[];
  /** Only for PF. */
  pfLimit: PfLimitEvaluation | null;
}

/** pt-BR messages for the buyer (quote/checkout); never reveal seller details. */
const BUYER_MESSAGES: Record<SellerBlockReason, string> = {
  not_enabled: "Este produto ainda não está disponível para compra.",
  no_ship_from: "O criador ainda não configurou o envio deste produto.",
  terms_not_accepted: "Este produto ainda não está disponível para compra.",
  no_document_type: "Este produto ainda não está disponível para compra.",
  pf_limit_reached: PF_LIMIT_BUYER_MESSAGE,
};

export function buyerMessageFor(reason: SellerBlockReason): string {
  return BUYER_MESSAGES[reason];
}

/**
 * Single answer to "can this creator receive a new physical order?". Checked
 * BEFORE the sale (quote, checkout, product page) so a sale never happens for
 * a creator who couldn't generate the label afterwards. Orders already paid
 * are not affected (prepare-shipment only checks the document rules).
 */
export async function getSellerEligibility(
  creatorId: string,
  now: Date = new Date()
): Promise<SellerEligibility> {
  const [shipFrom, acceptance] = await Promise.all([
    getShipFrom(creatorId),
    getServerSellerTermsRepository().getAcceptance(creatorId, SELLER_TERMS_VERSION),
  ]);
  const termsAccepted = Boolean(acceptance);
  const profile = shipFrom ? effectiveSellerProfile(shipFrom) : null;
  const documents = allowedDocumentTypes(profile, documentRuleOptions());

  let pfLimit: PfLimitEvaluation | null = null;
  if (profile === "pf") {
    const usage = await getOrderRepository().summarizePhysicalPaidByCreatorSince(
      creatorId,
      monthStartInSaoPaulo(now)
    );
    pfLimit = evaluatePfLimit(
      { orders: usage.count, amountCents: usage.amountCents },
      PF_LIMITS
    );
  }

  const blockReason: SellerBlockReason | undefined = !canSellPhysical(creatorId)
    ? "not_enabled"
    : !shipFrom
      ? "no_ship_from"
      : !termsAccepted
        ? "terms_not_accepted"
        : documents.length === 0
          ? "no_document_type"
          : pfLimit?.status === "reached"
            ? "pf_limit_reached"
            : undefined;

  return {
    canSell: !blockReason,
    blockReason,
    shipFrom,
    profile,
    termsAccepted,
    allowedDocumentTypes: documents,
    pfLimit,
  };
}
