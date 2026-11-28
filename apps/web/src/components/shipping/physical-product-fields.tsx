"use client";

import { Calculator, Gift, Truck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchShipFromStatus } from "@/components/shipping/ship-from-form";
import { ProhibitedItemsList, SellerTermsCard } from "@/components/shipping/seller-terms-card";
import { Button } from "@vippin/ui/button";
import { Input } from "@vippin/ui/input";
import { Label } from "@vippin/ui/label";
import { Loading } from "@vippin/ui/loading";
import { formatBRL } from "@vippin/core/domain/money";
import {
  PHYSICAL_PRODUCT_LIMITS,
  validateShippingPackage,
} from "@vippin/core/domain/shipping";
import type { ShippingMode } from "@vippin/core/models/product";
import { cn } from "@vippin/ui/lib/utils";

export interface PhysicalFieldsValue {
  weightGrams: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  stock: string;
  shippingMode: ShippingMode;
}

export function physicalFieldsFromProduct(product?: {
  weightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  stock?: number;
  shippingMode?: ShippingMode;
}): PhysicalFieldsValue {
  return {
    weightGrams: product?.weightGrams ? String(product.weightGrams) : "",
    lengthCm: product?.lengthCm ? String(product.lengthCm) : "",
    widthCm: product?.widthCm ? String(product.widthCm) : "",
    heightCm: product?.heightCm ? String(product.heightCm) : "",
    stock: product?.stock !== undefined ? String(product.stock) : "",
    shippingMode: product?.shippingMode ?? "buyer_pays",
  };
}

export function parsePhysicalFields(value: PhysicalFieldsValue) {
  return {
    weightGrams: Number.parseInt(value.weightGrams, 10) || 0,
    lengthCm: Number.parseInt(value.lengthCm, 10) || 0,
    widthCm: Number.parseInt(value.widthCm, 10) || 0,
    heightCm: Number.parseInt(value.heightCm, 10) || 0,
    stock: Number.parseInt(value.stock, 10),
    shippingMode: value.shippingMode,
  };
}

/** Returns a pt-BR error or null (UX only — the DB CHECKs are the guard). */
export function validatePhysicalFields(value: PhysicalFieldsValue): string | null {
  const parsed = parsePhysicalFields(value);
  const packageError = validateShippingPackage(parsed);
  if (packageError) return packageError;
  if (!Number.isInteger(parsed.stock) || parsed.stock < 0 || parsed.stock > PHYSICAL_PRODUCT_LIMITS.stockMax) {
    return "Informe o estoque (0 ou mais unidades).";
  }
  return null;
}

interface Estimate {
  label: string;
  freightCents: number | null;
  deliveryDays: number | null;
  creatorNetCents: number | null;
  viable: boolean;
}

interface PhysicalProductFieldsProps {
  value: PhysicalFieldsValue;
  onChange: (value: PhysicalFieldsValue) => void;
  priceCents: number;
  disabled?: boolean;
  /** Seller terms acceptance state (null while loading). */
  onTermsAcceptedChange?: (accepted: boolean | null) => void;
}

function digitsOnly(value: string, max: number) {
  return value.replace(/\D/g, "").slice(0, max);
}

/**
 * Package, stock and freight-payer fields for a physical product, plus a
 * freight simulator against reference capitals so the creator can price it.
 */
export function PhysicalProductFields({
  value,
  onChange,
  priceCents,
  disabled,
  onTermsAcceptedChange,
}: PhysicalProductFieldsProps) {
  const [hasShipFrom, setHasShipFrom] = useState<boolean | null>(null);
  const [estimates, setEstimates] = useState<Estimate[] | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  useEffect(() => {
    fetchShipFromStatus()
      .then((status) => setHasShipFrom(Boolean(status.shipFrom)))
      .catch(() => setHasShipFrom(false));
  }, []);

  function set<K extends keyof PhysicalFieldsValue>(key: K, next: PhysicalFieldsValue[K]) {
    onChange({ ...value, [key]: next });
    setEstimates(null);
  }

  async function simulate() {
    const error = validatePhysicalFields({ ...value, stock: value.stock || "0" });
    if (error) {
      setSimError(error);
      return;
    }
    setSimError(null);
    setSimulating(true);
    try {
      const parsed = parsePhysicalFields(value);
      const res = await fetch("/api/shipping/estimate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...parsed, priceCents, mode: value.shippingMode }),
      });
      const body = (await res.json()) as { estimates?: Estimate[]; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Não foi possível simular.");
      setEstimates(body.estimates ?? []);
    } catch (err) {
      setSimError(err instanceof Error ? err.message : "Não foi possível simular.");
    } finally {
      setSimulating(false);
    }
  }

  const modeOptions: { mode: ShippingMode; title: string; description: string; icon: typeof Truck }[] = [
    {
      mode: "buyer_pays",
      title: "Comprador paga o frete",
      description: "O frete é calculado no checkout pelo CEP e somado ao PIX.",
      icon: Truck,
    },
    {
      mode: "free",
      title: "Frete grátis",
      description: "O comprador não paga frete. O custo sai do seu repasse dessa venda.",
      icon: Gift,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <SellerTermsCard onAcceptedChange={onTermsAcceptedChange} disabled={disabled} />
      <ProhibitedItemsList />
      {hasShipFrom === false && (
        <div className="rounded-xl border border-dashed border-destructive/50 bg-destructive/5 p-3 text-sm">
          <p className="font-semibold">Cadastre seu endereço de remetente</p>
          <p className="text-muted-foreground text-xs">
            Ele é obrigatório para vender produtos físicos e aparece nas etiquetas.{" "}
            <Link href="/painel/envios" className="underline">
              Cadastrar agora
            </Link>
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label>Embalagem (já com a caixa/envelope)</Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs font-medium">Peso (g)</span>
            <Input
              inputMode="numeric"
              value={value.weightGrams}
              onChange={(e) => set("weightGrams", digitsOnly(e.target.value, 5))}
              placeholder="300"
              disabled={disabled}
              aria-label="Peso em gramas"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs font-medium">Compr. (cm)</span>
            <Input
              inputMode="numeric"
              value={value.lengthCm}
              onChange={(e) => set("lengthCm", digitsOnly(e.target.value, 3))}
              placeholder="20"
              disabled={disabled}
              aria-label="Comprimento em centímetros"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs font-medium">Largura (cm)</span>
            <Input
              inputMode="numeric"
              value={value.widthCm}
              onChange={(e) => set("widthCm", digitsOnly(e.target.value, 3))}
              placeholder="15"
              disabled={disabled}
              aria-label="Largura em centímetros"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs font-medium">Altura (cm)</span>
            <Input
              inputMode="numeric"
              value={value.heightCm}
              onChange={(e) => set("heightCm", digitsOnly(e.target.value, 3))}
              placeholder="5"
              disabled={disabled}
              aria-label="Altura em centímetros"
            />
          </div>
        </div>
        <p className="text-muted-foreground text-xs">
          Meça e pese o pacote pronto para envio. Medidas erradas podem gerar
          cobrança de diferença pela transportadora, descontada do seu repasse.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="stock">Estoque (unidades)</Label>
        <Input
          id="stock"
          inputMode="numeric"
          value={value.stock}
          onChange={(e) => set("stock", digitsOnly(e.target.value, 6))}
          placeholder="10"
          disabled={disabled}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Quem paga o frete?</Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {modeOptions.map((option) => {
            const Icon = option.icon;
            const selected = value.shippingMode === option.mode;
            return (
              <button
                key={option.mode}
                type="button"
                disabled={disabled}
                onClick={() => set("shippingMode", option.mode)}
                aria-pressed={selected}
                className={cn(
                  "flex items-start gap-3 rounded-xl border border-border p-3 text-left transition-[color,background-color,border-color,opacity,transform] cursor-pointer",
                  selected
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-background hover:-translate-y-0.5 hover:shadow-elevated-sm"
                )}
              >
                <Icon className="mt-0.5 size-5 shrink-0" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">{option.title}</span>
                  <span className="text-muted-foreground text-xs font-medium">
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Simular frete</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void simulate()}
            disabled={disabled || simulating || hasShipFrom === false}
          >
            {simulating ? <Loading /> : <Calculator className="size-4" />}
            Simular
          </Button>
        </div>
        {simError && (
          <p className="text-destructive text-xs" role="alert">
            {simError}
          </p>
        )}
        {estimates && (
          <ul className="flex flex-col gap-1.5 text-xs">
            {estimates.map((estimate) => (
              <li
                key={estimate.label}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background px-2.5 py-1.5"
              >
                <span className="font-medium">{estimate.label}</span>
                {estimate.freightCents === null ? (
                  <span className="text-muted-foreground">Sem cotação</span>
                ) : (
                  <span className="text-right">
                    Frete {formatBRL(estimate.freightCents)}
                    {estimate.deliveryDays ? ` · ${estimate.deliveryDays} dias úteis` : ""}
                    <br />
                    {estimate.viable ? (
                      <span className="font-semibold">
                        Você recebe {formatBRL(estimate.creatorNetCents ?? 0)}
                      </span>
                    ) : (
                      <span className="text-destructive font-semibold">
                        Frete grátis inviável neste preço
                      </span>
                    )}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {!estimates && !simError && (
          <p className="text-muted-foreground text-xs">
            Veja quanto custa o frete saindo do seu CEP para algumas capitais e
            quanto sobra para você.
          </p>
        )}
      </div>
    </div>
  );
}
