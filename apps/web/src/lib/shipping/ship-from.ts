import "server-only";

import {
  isValidBrPhone,
  isValidBrState,
  isValidCep,
  isValidCpfOrCnpj,
  onlyDigits,
} from "@vippin/core/domain/br-documents";
import {
  isProfileCompatibleWithDocument,
  isSellerProfile,
  profilesForDocument,
  type SellerProfile,
} from "@vippin/core/domain/seller-profile";
import type { ShipFromAddress } from "@vippin/core/models/shipping";
import { createSupabaseAdminClient } from "@vippin/supabase/client/admin";

type ShipFromRow = {
  ship_from_name: string | null;
  ship_from_document: string | null;
  ship_from_state_register: string | null;
  ship_from_phone: string | null;
  ship_from_postal_code: string | null;
  ship_from_street: string | null;
  ship_from_number: string | null;
  ship_from_complement: string | null;
  ship_from_district: string | null;
  ship_from_city: string | null;
  ship_from_state: string | null;
  seller_profile: string | null;
  email: string | null;
};

const COLUMNS =
  "ship_from_name, ship_from_document, ship_from_state_register, ship_from_phone, " +
  "ship_from_postal_code, ship_from_street, ship_from_number, ship_from_complement, " +
  "ship_from_district, ship_from_city, ship_from_state, seller_profile, email";

/** Creator's sender data, or null when incomplete (can't ship yet). */
export async function getShipFrom(creatorId: string): Promise<ShipFromAddress | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select(COLUMNS)
    .eq("id", creatorId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return toShipFrom(data as ShipFromRow | null);
}

function toShipFrom(row: ShipFromRow | null): ShipFromAddress | null {
  if (
    !row?.ship_from_name ||
    !row.ship_from_document ||
    !row.ship_from_phone ||
    !row.ship_from_postal_code ||
    !row.ship_from_street ||
    !row.ship_from_number ||
    !row.ship_from_district ||
    !row.ship_from_city ||
    !row.ship_from_state
  ) {
    return null;
  }
  return {
    name: row.ship_from_name,
    document: row.ship_from_document,
    stateRegister: row.ship_from_state_register ?? undefined,
    phone: row.ship_from_phone,
    email: row.email ?? undefined,
    postalCode: row.ship_from_postal_code,
    street: row.ship_from_street,
    number: row.ship_from_number,
    complement: row.ship_from_complement ?? undefined,
    district: row.ship_from_district,
    city: row.ship_from_city,
    state: row.ship_from_state,
    sellerProfile: isSellerProfile(row.seller_profile) ? row.seller_profile : undefined,
  };
}

/**
 * Profile the rules apply to: the stored choice when it matches the document,
 * otherwise CPF ⇒ PF and a legacy CNPJ without a choice ⇒ MEI (keeps the
 * behaviour sellers had before profiles existed; the form asks them to choose).
 */
export function effectiveSellerProfile(shipFrom: ShipFromAddress): SellerProfile {
  if (
    shipFrom.sellerProfile &&
    isProfileCompatibleWithDocument(shipFrom.sellerProfile, shipFrom.document)
  ) {
    return shipFrom.sellerProfile;
  }
  return onlyDigits(shipFrom.document).length === 11 ? "pf" : "mei";
}

export type ShipFromInput = Omit<ShipFromAddress, "email">;

/** Normalizes + validates; returns `{ value }` or `{ error }` (pt-BR). */
export function parseShipFromInput(
  raw: unknown
): { value: ShipFromInput } | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "Requisição inválida." };
  const r = raw as Record<string, unknown>;
  const str = (key: string) => (typeof r[key] === "string" ? (r[key] as string).trim() : "");

  const value: ShipFromInput = {
    name: str("name"),
    document: onlyDigits(str("document")),
    stateRegister: str("stateRegister") || undefined,
    phone: onlyDigits(str("phone")),
    postalCode: onlyDigits(str("postalCode")),
    street: str("street"),
    number: str("number"),
    complement: str("complement") || undefined,
    district: str("district"),
    city: str("city"),
    state: str("state").toUpperCase(),
  };

  const error = validateAddressFields(value, "remetente");
  if (error) return { error };

  // CPF ⇒ always PF; CNPJ ⇒ the creator must choose MEI or Empresa.
  const options = profilesForDocument(value.document);
  const chosen = r.sellerProfile;
  if (options.length === 1) {
    value.sellerProfile = options[0];
  } else if (isSellerProfile(chosen) && options.includes(chosen)) {
    value.sellerProfile = chosen;
  } else {
    return { error: "Com CNPJ, escolha se você é MEI ou empresa." };
  }
  if (value.stateRegister && value.stateRegister.length > 20) {
    return { error: "Inscrição estadual muito longa." };
  }
  return { value };
}

/** Shared address validation (sender and recipient). */
export function validateAddressFields(
  value: Omit<ShipFromAddress, "email" | "stateRegister">,
  who: "remetente" | "destinatário"
): string | null {
  if (value.name.length < 3 || value.name.length > 80) {
    return `Informe o nome completo do ${who}.`;
  }
  if (!isValidCpfOrCnpj(value.document)) return "CPF ou CNPJ inválido.";
  if (!isValidBrPhone(value.phone)) return "Telefone inválido (DDD + número).";
  if (!isValidCep(value.postalCode)) return "CEP inválido.";
  if (value.street.length < 2 || value.street.length > 120) return "Informe a rua.";
  if (!value.number || value.number.length > 10) return "Informe o número (ou S/N).";
  if ((value.complement ?? "").length > 60) return "Complemento muito longo.";
  if (value.district.length < 2 || value.district.length > 60) return "Informe o bairro.";
  if (value.city.length < 2 || value.city.length > 60) return "Informe a cidade.";
  if (!isValidBrState(value.state)) return "UF inválida.";
  return null;
}

export async function saveShipFrom(creatorId: string, value: ShipFromInput): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      ship_from_name: value.name,
      ship_from_document: value.document,
      ship_from_state_register: value.stateRegister ?? null,
      ship_from_phone: value.phone,
      ship_from_postal_code: value.postalCode,
      ship_from_street: value.street,
      ship_from_number: value.number,
      ship_from_complement: value.complement ?? null,
      ship_from_district: value.district,
      ship_from_city: value.city,
      ship_from_state: value.state,
      seller_profile: value.sellerProfile ?? null,
    })
    .eq("id", creatorId);
  if (error) throw new Error(error.message);
}
