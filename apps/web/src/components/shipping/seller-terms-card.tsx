"use client";

import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@vippin/ui/button";
import { Loading } from "@vippin/ui/loading";
import {
  PROHIBITED_ITEMS,
  SELLER_TERMS_SECTIONS,
  SELLER_TERMS_TITLE,
  SELLER_TERMS_VERSION,
} from "@vippin/core/domain/seller-terms";
import { sellerTermsRepository } from "@vippin/supabase/factories/repository-factory";

interface SellerTermsCardProps {
  /** Reports the acceptance state (null while loading). */
  onAcceptedChange?: (accepted: boolean | null) => void;
  disabled?: boolean;
}

/** Prohibited items list (always visible on physical products). */
export function ProhibitedItemsList() {
  return (
    <div className="rounded-xl border border-border bg-muted p-3 text-sm">
      <p className="font-bold">Itens proibidos (Correios e Vippin)</p>
      <ul className="text-muted-foreground mt-1 list-disc pl-5 text-xs">
        {PROHIBITED_ITEMS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Termos do vendedor: shown until the creator accepts the current version.
 * The acceptance is an immutable record (version + date); the database also
 * refuses publishing a physical product without it.
 */
export function SellerTermsCard({ onAcceptedChange, disabled }: SellerTermsCardProps) {
  const { user } = useAuth();
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    sellerTermsRepository
      .getAcceptance(user.id, SELLER_TERMS_VERSION)
      .then((acceptance) => active && setAccepted(Boolean(acceptance)))
      .catch(() => active && setAccepted(false));
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    onAcceptedChange?.(accepted);
  }, [accepted, onAcceptedChange]);

  async function accept() {
    if (!user) return;
    if (!checked) {
      setError("Marque a caixa para aceitar os termos.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await sellerTermsRepository.accept(user.id, SELLER_TERMS_VERSION);
      setAccepted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar o aceite.");
    } finally {
      setSaving(false);
    }
  }

  if (accepted === null) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loading /> Carregando termos...
      </p>
    );
  }

  if (accepted) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
        <ShieldCheck className="size-4" /> Você aceitou os {SELLER_TERMS_TITLE.toLowerCase()}.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-3">
      <p className="flex items-center gap-2 font-bold">
        <ShieldCheck className="size-5" /> {SELLER_TERMS_TITLE}
      </p>
      <div className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-1 text-xs">
        {SELLER_TERMS_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="font-bold">{section.title}</p>
            <p className="text-muted-foreground">{section.body}</p>
          </div>
        ))}
      </div>
      <label className="flex items-start gap-2 text-xs">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          disabled={disabled || saving}
          className="mt-0.5 size-4 accent-current"
        />
        <span>Li e aceito os termos do vendedor e a lista de itens proibidos.</span>
      </label>
      {error && (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      )}
      <Button type="button" variant="outline" onClick={() => void accept()} disabled={disabled || saving}>
        {saving ? "Registrando..." : "Aceitar termos"}
      </Button>
    </div>
  );
}
