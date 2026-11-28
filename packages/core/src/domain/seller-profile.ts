/**
 * Fiscal profile of a physical-product seller and the shipping document each
 * profile may attach to a label (pure; used by the client for UX and by the
 * server as the real rule).
 *
 *   PF (CPF)        → only DC-e (declaração de conteúdo), eventual sales with a monthly limit
 *   MEI (CNPJ)      → NF-e, or DC-e while `allowDceForMei` is on
 *   Empresa (CNPJ)  → only NF-e
 */

import { onlyDigits } from "./br-documents";
import type { ShipmentDocumentType } from "../models/shipment";

export type SellerProfile = "pf" | "mei" | "company";

export const SELLER_PROFILES: readonly SellerProfile[] = ["pf", "mei", "company"];

export const SELLER_PROFILE_LABELS: Record<SellerProfile, string> = {
  pf: "Pessoa física",
  mei: "MEI",
  company: "Empresa",
};

export function isSellerProfile(value: unknown): value is SellerProfile {
  return typeof value === "string" && (SELLER_PROFILES as readonly string[]).includes(value);
}

/** CPF ⇒ PF. CNPJ ⇒ MEI or Empresa (the creator chooses; `null` = undecided). */
export function profilesForDocument(document: string | null | undefined): SellerProfile[] {
  const digits = onlyDigits(document);
  if (digits.length === 11) return ["pf"];
  if (digits.length === 14) return ["mei", "company"];
  return [];
}

export function isProfileCompatibleWithDocument(
  profile: SellerProfile,
  document: string | null | undefined
): boolean {
  return profilesForDocument(document).includes(profile);
}

export interface DocumentRuleOptions {
  /** ALLOW_DCE_FOR_MEI (default true). */
  allowDceForMei: boolean;
  /** Global kill switch (ALLOW_DCE_FOR_SALES=false turns DC-e off for everyone). */
  dceEnabled: boolean;
}

export function allowedDocumentTypes(
  profile: SellerProfile | null | undefined,
  options: DocumentRuleOptions
): ShipmentDocumentType[] {
  switch (profile) {
    case "pf":
      return options.dceEnabled ? ["dce"] : [];
    case "mei":
      return options.dceEnabled && options.allowDceForMei ? ["nfe", "dce"] : ["nfe"];
    case "company":
      return ["nfe"];
    default:
      return [];
  }
}
