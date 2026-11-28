"use client";

import { MapPin } from "lucide-react";
import { useEffect, useState } from "react";

import {
  AddressFields,
  EMPTY_ADDRESS,
  toAddressPayload,
  validateAddressForm,
  type AddressFormValue,
} from "@/components/shipping/address-fields";
import { Button } from "@vippin/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@vippin/ui/card";
import { Input } from "@vippin/ui/input";
import { Label } from "@vippin/ui/label";
import { Loading } from "@vippin/ui/loading";
import { onlyDigits } from "@vippin/core/domain/br-documents";
import { formatBRL } from "@vippin/core/domain/money";
import {
  PF_LIMIT_NEAR_MESSAGE,
  PF_LIMIT_REACHED_MESSAGE,
  type PfLimitEvaluation,
} from "@vippin/core/domain/pf-limit";
import {
  profilesForDocument,
  SELLER_PROFILE_LABELS,
  type SellerProfile,
} from "@vippin/core/domain/seller-profile";
import type { ShipmentDocumentType } from "@vippin/core/models/shipment";
import type { ShipFromAddress } from "@vippin/core/models/shipping";
import { cn } from "@vippin/ui/lib/utils";
import { toast } from "@/lib/toast";

export interface ShipFromStatus {
  /** Rollout allowlist (PHYSICAL_PRODUCTS_CREATOR_IDS). */
  allowed: boolean;
  /** Can receive NEW physical orders right now. */
  canSell: boolean;
  blockReason:
    | "not_enabled"
    | "no_ship_from"
    | "terms_not_accepted"
    | "no_document_type"
    | "pf_limit_reached"
    | null;
  shipFrom: ShipFromAddress | null;
  sellerProfile: SellerProfile | null;
  termsAccepted: boolean;
  allowedDocumentTypes: ShipmentDocumentType[];
  pfLimit: PfLimitEvaluation | null;
}

/** Warning for PF sellers near/at the monthly limit (null when fine). */
export function PfLimitNotice({ pfLimit }: { pfLimit: PfLimitEvaluation | null }) {
  if (!pfLimit || pfLimit.status === "ok") return null;
  const { usage, limits } = pfLimit;
  const reached = pfLimit.status === "reached";
  return (
    <div
      role="status"
      className={cn(
        "rounded-xl border border-border p-3 text-sm font-medium",
        reached ? "bg-destructive/10" : "bg-muted"
      )}
    >
      <p className="font-semibold">{reached ? PF_LIMIT_REACHED_MESSAGE : PF_LIMIT_NEAR_MESSAGE}</p>
      <p className="text-muted-foreground mt-1 text-xs">
        Este mês: {usage.orders} de {limits.maxOrders} pedidos ·{" "}
        {formatBRL(usage.amountCents)} de {formatBRL(limits.maxAmountCents)}.
        {" "}Como MEI você emite NF-e pelo emissor gratuito da SEFAZ e vende sem esse limite.
      </p>
    </div>
  );
}

/** Loads `/api/profile/ship-from` (creator only). */
export async function fetchShipFromStatus(): Promise<ShipFromStatus> {
  const res = await fetch("/api/profile/ship-from", { cache: "no-store" });
  const body = (await res.json()) as ShipFromStatus & { error?: string };
  if (!res.ok) throw new Error(body.error ?? "Não foi possível carregar o endereço.");
  return body;
}

function toForm(address: ShipFromAddress | null): AddressFormValue {
  if (!address) return EMPTY_ADDRESS;
  return {
    name: address.name,
    document: address.document,
    phone: address.phone,
    postalCode: address.postalCode,
    street: address.street,
    number: address.number,
    complement: address.complement ?? "",
    district: address.district,
    city: address.city,
    state: address.state,
  };
}

interface ShipFromFormProps {
  onSaved?: (address: ShipFromAddress) => void;
}

/**
 * Creator's sender address (printed on every label). Saved server-side via
 * `/api/profile/ship-from` (PII, service role).
 */
export function ShipFromForm({ onSaved }: ShipFromFormProps) {
  const [value, setValue] = useState<AddressFormValue>(EMPTY_ADDRESS);
  const [stateRegister, setStateRegister] = useState("");
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [pfLimit, setPfLimit] = useState<PfLimitEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchShipFromStatus()
      .then((status) => {
        if (!active) return;
        setValue(toForm(status.shipFrom));
        setStateRegister(status.shipFrom?.stateRegister ?? "");
        setSellerProfile(status.shipFrom?.sellerProfile ?? null);
        setPfLimit(status.pfLimit);
        setSaved(Boolean(status.shipFrom));
      })
      .catch((err) => active && setError(err instanceof Error ? err.message : String(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validation = validateAddressForm(value);
    if (validation) {
      setError(validation);
      return;
    }
    if (profileOptions.length > 1 && !selectedProfile) {
      setError("Com CNPJ, escolha se você é MEI ou empresa.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/profile/ship-from", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...toAddressPayload(value),
          stateRegister: stateRegister.trim() || undefined,
          sellerProfile: selectedProfile ?? undefined,
        }),
      });
      const body = (await res.json()) as {
        error?: string;
        shipFrom?: ShipFromAddress;
        pfLimit?: PfLimitEvaluation | null;
      };
      if (!res.ok) throw new Error(body.error ?? "Não foi possível salvar.");
      setSaved(true);
      setPfLimit(body.pfLimit ?? null);
      toast.saved();
      if (body.shipFrom) onSaved?.(body.shipFrom);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível salvar.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  // CPF ⇒ PF; CNPJ ⇒ MEI or Empresa (creator's choice).
  const profileOptions = profilesForDocument(onlyDigits(value.document));
  const selectedProfile: SellerProfile | null =
    profileOptions.length === 1
      ? profileOptions[0]!
      : sellerProfile && profileOptions.includes(sellerProfile)
        ? sellerProfile
        : null;

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="size-5" />
            Endereço de remetente
          </CardTitle>
          <CardDescription>
            Usado em todas as suas etiquetas. Atenção: este endereço aparece
            impresso no pacote que chega ao seu fã — se preferir, use um
            endereço comercial, escritório ou caixa postal.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {loading ? (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loading /> Carregando...
            </p>
          ) : (
            <>
              <AddressFields
                idPrefix="ship-from"
                value={value}
                onChange={(next) => {
                  setValue(next);
                  setSaved(false);
                }}
                disabled={saving}
                nameLabel="Nome do remetente"
              />
              <div className="flex flex-col gap-2">
                <Label htmlFor="ship-from-ie">Inscrição estadual (opcional)</Label>
                <Input
                  id="ship-from-ie"
                  value={stateRegister}
                  onChange={(e) => {
                    setStateRegister(e.target.value.slice(0, 20));
                    setSaved(false);
                  }}
                  placeholder="Só se você emite NF-e como empresa"
                  disabled={saving}
                />
              </div>
              {profileOptions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <Label>Perfil fiscal</Label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {(["pf", "mei", "company"] as const).map((profile) => {
                      const enabled = profileOptions.includes(profile);
                      const selected = selectedProfile === profile;
                      return (
                        <button
                          key={profile}
                          type="button"
                          disabled={saving || !enabled}
                          aria-pressed={selected}
                          onClick={() => {
                            setSellerProfile(profile);
                            setSaved(false);
                          }}
                          className={cn(
                            "rounded-xl border border-border p-3 text-left text-sm font-semibold transition-[color,background-color,border-color,opacity,transform]",
                            selected
                              ? "bg-secondary text-secondary-foreground"
                              : "bg-background",
                            enabled
                              ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-elevated-sm"
                              : "cursor-not-allowed opacity-50"
                          )}
                        >
                          {SELLER_PROFILE_LABELS[profile]}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {selectedProfile === "pf"
                      ? "Pessoa física envia com declaração de conteúdo, para vendas eventuais, com limite mensal de vendas."
                      : selectedProfile === "mei"
                        ? "MEI pode enviar com NF-e (recomendado, emissor gratuito da SEFAZ) ou declaração de conteúdo."
                        : selectedProfile === "company"
                          ? "Empresa precisa emitir NF-e em toda venda."
                          : "Com CNPJ, escolha se você é MEI ou empresa."}
                  </p>
                </div>
              )}
              <PfLimitNotice pfLimit={pfLimit} />
            </>
          )}

          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading || saving}>
            {saving ? "Salvando..." : saved ? "Endereço salvo" : "Salvar endereço"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
