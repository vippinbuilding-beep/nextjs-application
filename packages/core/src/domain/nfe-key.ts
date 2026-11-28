/**
 * NF-e access key (chave de acesso) validation: 44 digits, the last one being a
 * modulo-11 check digit over the first 43 (weights 2..9 cycling right-to-left).
 */

import { onlyDigits } from "./br-documents";

export function normalizeNfeKey(value: string): string {
  return onlyDigits(value);
}

export function isValidNfeKey(value: string): boolean {
  const key = normalizeNfeKey(value);
  if (key.length !== 44) return false;

  let sum = 0;
  let weight = 2;
  for (let i = 42; i >= 0; i--) {
    sum += Number(key[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const rest = sum % 11;
  const dv = rest < 2 ? 0 : 11 - rest;
  return dv === Number(key[43]);
}

/** IBGE state codes (first two digits of the NF-e key) → UF. */
const IBGE_UF: Record<string, string> = {
  "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO",
  "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL",
  "28": "SE", "29": "BA", "31": "MG", "32": "ES", "33": "RJ", "35": "SP", "41": "PR",
  "42": "SC", "43": "RS", "50": "MS", "51": "MT", "52": "GO", "53": "DF",
};

/** UF of the issuer (positions 1–2, IBGE code), or null if unknown. */
export function nfeKeyUf(value: string): string | null {
  return IBGE_UF[normalizeNfeKey(value).slice(0, 2)] ?? null;
}

/** Issuer CNPJ embedded in the key (positions 7–20). */
export function nfeKeyCnpj(value: string): string {
  return normalizeNfeKey(value).slice(6, 20);
}

/**
 * Full check of a NF-e key against the sender: valid key, issued by the
 * sender's CNPJ, from the sender's state. Returns a pt-BR error or null.
 */
export function validateNfeKeyForSender(
  value: string,
  sender: { document: string; state: string }
): string | null {
  const key = normalizeNfeKey(value);
  if (!isValidNfeKey(key)) return "Chave da NF-e inválida. Confira os 44 dígitos.";
  const senderDocument = onlyDigits(sender.document);
  if (senderDocument.length !== 14)
    return "NF-e exige CNPJ no endereço de remetente.";
  if (nfeKeyCnpj(key) !== senderDocument)
    return "Esta NF-e foi emitida por outro CNPJ. Use a nota emitida pelo CNPJ do remetente.";
  const uf = nfeKeyUf(key);
  if (!uf || uf !== sender.state.toUpperCase())
    return `Esta NF-e é de outro estado (${uf ?? "desconhecido"}). A UF da nota precisa ser a do endereço de remetente (${sender.state.toUpperCase()}).`;
  return null;
}
