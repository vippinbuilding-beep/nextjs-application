"use client";

import { useState } from "react";

import {
  BR_STATES,
  formatCep,
  isValidBrPhone,
  isValidBrState,
  isValidCep,
  isValidCpfOrCnpj,
  onlyDigits,
} from "@vippin/core/domain/br-documents";
import { Input } from "@vippin/ui/input";
import { Label } from "@vippin/ui/label";
import { Loading } from "@vippin/ui/loading";

export interface AddressFormValue {
  name: string;
  document: string;
  phone: string;
  postalCode: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
}

export const EMPTY_ADDRESS: AddressFormValue = {
  name: "",
  document: "",
  phone: "",
  postalCode: "",
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
};

export function formatDocument(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
  }
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function formatPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Client-side validation (UX only — the server validates again). */
export function validateAddressForm(value: AddressFormValue): string | null {
  if (value.name.trim().length < 3) return "Informe o nome completo.";
  if (!isValidCpfOrCnpj(value.document)) return "CPF ou CNPJ inválido.";
  if (!isValidBrPhone(value.phone)) return "Telefone inválido (DDD + número).";
  if (!isValidCep(value.postalCode)) return "CEP inválido.";
  if (value.street.trim().length < 2) return "Informe a rua.";
  if (!value.number.trim()) return "Informe o número (ou S/N).";
  if (value.district.trim().length < 2) return "Informe o bairro.";
  if (value.city.trim().length < 2) return "Informe a cidade.";
  if (!isValidBrState(value.state)) return "Informe a UF.";
  return null;
}

/** Payload with digits-only document/phone/CEP. */
export function toAddressPayload(value: AddressFormValue) {
  return {
    name: value.name.trim(),
    document: onlyDigits(value.document),
    phone: onlyDigits(value.phone),
    postalCode: onlyDigits(value.postalCode),
    street: value.street.trim(),
    number: value.number.trim(),
    complement: value.complement.trim() || undefined,
    district: value.district.trim(),
    city: value.city.trim(),
    state: value.state.trim().toUpperCase(),
  };
}

interface ViaCepResponse {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
}

interface AddressFieldsProps {
  idPrefix: string;
  value: AddressFormValue;
  onChange: (value: AddressFormValue) => void;
  disabled?: boolean;
  /** Labels the person field ("Nome do destinatário", "Nome do remetente"). */
  nameLabel?: string;
  /** Called after a successful CEP lookup (e.g. to re-quote freight). */
  onPostalCodeResolved?: (postalCode: string) => void;
}

/**
 * Brazilian address + document fields with CEP auto-fill (ViaCEP, browser
 * side). Reused by the creator's sender form and the buyer's checkout.
 */
export function AddressFields({
  idPrefix,
  value,
  onChange,
  disabled,
  nameLabel = "Nome completo",
  onPostalCodeResolved,
}: AddressFieldsProps) {
  const [lookingUp, setLookingUp] = useState(false);

  function set<K extends keyof AddressFormValue>(key: K, next: AddressFormValue[K]) {
    onChange({ ...value, [key]: next });
  }

  async function handleCepChange(raw: string) {
    const formatted = formatCep(raw);
    const next = { ...value, postalCode: formatted };
    onChange(next);

    const digits = onlyDigits(formatted);
    if (digits.length !== 8) return;
    setLookingUp(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = (await res.json()) as ViaCepResponse;
      if (!data.erro) {
        onChange({
          ...next,
          street: data.logradouro || next.street,
          district: data.bairro || next.district,
          city: data.localidade || next.city,
          state: data.uf || next.state,
        });
      }
      onPostalCodeResolved?.(digits);
    } catch {
      onPostalCodeResolved?.(digits);
    } finally {
      setLookingUp(false);
    }
  }

  const id = (key: string) => `${idPrefix}-${key}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor={id("name")}>{nameLabel}</Label>
        <Input
          id={id("name")}
          value={value.name}
          onChange={(e) => set("name", e.target.value.slice(0, 80))}
          autoComplete="name"
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={id("document")}>CPF ou CNPJ</Label>
          <Input
            id={id("document")}
            inputMode="numeric"
            value={formatDocument(value.document)}
            onChange={(e) => set("document", e.target.value)}
            placeholder="000.000.000-00"
            disabled={disabled}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={id("phone")}>Telefone</Label>
          <Input
            id={id("phone")}
            inputMode="tel"
            value={formatPhone(value.phone)}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="(11) 91234-5678"
            autoComplete="tel"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={id("cep")}>CEP</Label>
          <Input
            id={id("cep")}
            inputMode="numeric"
            value={formatCep(value.postalCode)}
            onChange={(e) => void handleCepChange(e.target.value)}
            placeholder="00000-000"
            autoComplete="postal-code"
            disabled={disabled}
          />
        </div>
        {lookingUp && (
          <span className="text-muted-foreground flex h-10 items-center gap-2 text-xs">
            <Loading /> Buscando...
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={id("street")}>Rua</Label>
        <Input
          id={id("street")}
          value={value.street}
          onChange={(e) => set("street", e.target.value.slice(0, 120))}
          autoComplete="address-line1"
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={id("number")}>Número</Label>
          <Input
            id={id("number")}
            value={value.number}
            onChange={(e) => set("number", e.target.value.slice(0, 10))}
            disabled={disabled}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={id("complement")}>Complemento (opcional)</Label>
          <Input
            id={id("complement")}
            value={value.complement}
            onChange={(e) => set("complement", e.target.value.slice(0, 60))}
            autoComplete="address-line2"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5rem]">
        <div className="flex flex-col gap-2">
          <Label htmlFor={id("district")}>Bairro</Label>
          <Input
            id={id("district")}
            value={value.district}
            onChange={(e) => set("district", e.target.value.slice(0, 60))}
            disabled={disabled}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={id("city")}>Cidade</Label>
          <Input
            id={id("city")}
            value={value.city}
            onChange={(e) => set("city", e.target.value.slice(0, 60))}
            autoComplete="address-level2"
            disabled={disabled}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={id("state")}>UF</Label>
          <Input
            id={id("state")}
            list={id("states")}
            value={value.state}
            onChange={(e) =>
              set("state", e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2))
            }
            autoComplete="address-level1"
            disabled={disabled}
          />
          <datalist id={id("states")}>
            {BR_STATES.map((uf) => (
              <option key={uf} value={uf} />
            ))}
          </datalist>
        </div>
      </div>
    </div>
  );
}
