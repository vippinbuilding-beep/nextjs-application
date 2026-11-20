"use client";

import { useEffect, useState } from "react";

import { Button } from "@vippin/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@vippin/ui/dialog";
import { Input } from "@vippin/ui/input";
import { Label } from "@vippin/ui/label";
import { Loading } from "@vippin/ui/loading";
import { isValidNfeKey } from "@vippin/core/domain/nfe-key";
import { validateShippingPackage } from "@vippin/core/domain/shipping";
import type { ShippingPackage } from "@vippin/core/models/shipping";
import { cn } from "@vippin/ui/lib/utils";

export interface PrepareTarget {
  shipmentId: string;
  productTitle: string;
  package?: ShippingPackage;
}

interface PrepareShipmentDialogProps {
  target: PrepareTarget | null;
  dceAllowed: boolean;
  onClose: () => void;
  onPrepared: () => void;
}

type DocumentType = "dce" | "nfe";

function toText(value?: number) {
  return value ? String(value) : "";
}

/**
 * "Preparar envio": confirm the real package and the fiscal document; the
 * server then buys + generates the label on the central Melhor Envio wallet.
 */
export function PrepareShipmentDialog({
  target,
  dceAllowed,
  onClose,
  onPrepared,
}: PrepareShipmentDialogProps) {
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [documentType, setDocumentType] = useState<DocumentType>(dceAllowed ? "dce" : "nfe");
  const [invoiceKey, setInvoiceKey] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    setWeight(toText(target.package?.weightGrams));
    setLength(toText(target.package?.lengthCm));
    setWidth(toText(target.package?.widthCm));
    setHeight(toText(target.package?.heightCm));
    setDocumentType(dceAllowed ? "dce" : "nfe");
    setInvoiceKey("");
    setAccepted(false);
    setError(null);
  }, [target, dceAllowed]);

  async function submit() {
    if (!target) return;
    const pkg: ShippingPackage = {
      weightGrams: Number.parseInt(weight, 10) || 0,
      lengthCm: Number.parseInt(length, 10) || 0,
      widthCm: Number.parseInt(width, 10) || 0,
      heightCm: Number.parseInt(height, 10) || 0,
    };
    const packageError = validateShippingPackage(pkg);
    if (packageError) {
      setError(packageError);
      return;
    }
    if (documentType === "nfe" && !isValidNfeKey(invoiceKey)) {
      setError("Chave da NF-e inválida. Confira os 44 dígitos.");
      return;
    }
    if (documentType === "dce" && !accepted) {
      setError("Confirme a declaração de conteúdo para continuar.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/shipments/${target.shipmentId}/prepare`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          package: pkg,
          documentType,
          invoiceKey: documentType === "nfe" ? invoiceKey : undefined,
        }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Não foi possível preparar o envio.");
      onPrepared();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível preparar o envio.");
    } finally {
      setSubmitting(false);
    }
  }

  const digits = (value: string, max: number) => value.replace(/\D/g, "").slice(0, max);

  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Preparar envio</DialogTitle>
          <DialogDescription>
            {target?.productTitle}. Confira o pacote: a etiqueta é gerada com
            estas medidas e não pode ser alterada depois.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Peso (g)", weight, setWeight, 5],
              ["Compr. (cm)", length, setLength, 3],
              ["Largura (cm)", width, setWidth, 3],
              ["Altura (cm)", height, setHeight, 3],
            ].map(([label, value, setter, max]) => (
              <div key={label as string} className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs font-medium">{label as string}</span>
                <Input
                  inputMode="numeric"
                  value={value as string}
                  onChange={(e) =>
                    (setter as (v: string) => void)(digits(e.target.value, max as number))
                  }
                  disabled={submitting}
                  aria-label={label as string}
                />
              </div>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">
            Se as medidas ficarem maiores que as do anúncio, a diferença de frete
            é descontada do seu repasse.
          </p>

          <div className="flex flex-col gap-2">
            <Label>Documento fiscal</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {dceAllowed && (
                <button
                  type="button"
                  onClick={() => setDocumentType("dce")}
                  aria-pressed={documentType === "dce"}
                  disabled={submitting}
                  className={cn(
                    "rounded-xl border-2 border-border px-3 py-2 text-left text-sm cursor-pointer",
                    documentType === "dce" ? "bg-primary shadow-cartoon-sm" : "bg-background"
                  )}
                >
                  <span className="font-bold">Declaração de conteúdo</span>
                  <span className="text-muted-foreground block text-xs">
                    Para quem vende como pessoa física, sem nota.
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setDocumentType("nfe")}
                aria-pressed={documentType === "nfe"}
                disabled={submitting}
                className={cn(
                  "rounded-xl border-2 border-border px-3 py-2 text-left text-sm cursor-pointer",
                  documentType === "nfe" ? "bg-primary shadow-cartoon-sm" : "bg-background"
                )}
              >
                <span className="font-bold">Nota fiscal (NF-e)</span>
                <span className="text-muted-foreground block text-xs">
                  Para MEI/empresa: informe a chave de acesso.
                </span>
              </button>
            </div>
          </div>

          {documentType === "nfe" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="nfe-key">Chave de acesso da NF-e</Label>
              <Input
                id="nfe-key"
                inputMode="numeric"
                value={invoiceKey}
                onChange={(e) => setInvoiceKey(digits(e.target.value, 44))}
                placeholder="44 dígitos"
                disabled={submitting}
              />
            </div>
          ) : (
            <label className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                disabled={submitting}
                className="mt-0.5 size-4 accent-current"
              />
              <span>
                Declaro que o conteúdo do pacote corresponde ao produto vendido e
                que sou responsável pela declaração de conteúdo deste envio. Ela
                sai junto com a etiqueta e deve ser colada do lado de fora da embalagem.
              </span>
            </label>
          )}

          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Voltar
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={submitting}>
            {submitting ? (
              <>
                <Loading /> Gerando etiqueta...
              </>
            ) : (
              "Gerar etiqueta"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
