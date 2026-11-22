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
