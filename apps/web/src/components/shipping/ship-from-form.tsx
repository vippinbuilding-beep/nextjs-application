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
import type { ShipFromAddress } from "@vippin/core/models/shipping";
import { toast } from "@/lib/toast";

export interface ShipFromStatus {
  allowed: boolean;
  dceAllowed: boolean;
  shipFrom: ShipFromAddress | null;
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
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/profile/ship-from", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...toAddressPayload(value),
          stateRegister: stateRegister.trim() || undefined,
        }),
      });
      const body = (await res.json()) as { error?: string; shipFrom?: ShipFromAddress };
      if (!res.ok) throw new Error(body.error ?? "Não foi possível salvar.");
      setSaved(true);
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
