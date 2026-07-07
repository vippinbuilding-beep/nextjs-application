"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCreatorShareLink } from "@/lib/metadata";

interface LinkStepFieldsProps {
  slug: string;
}

export function LinkStepFields({ slug }: LinkStepFieldsProps) {
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareLink = formatCreatorShareLink(slug, origin);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard pode estar indisponível (ex.: contexto não seguro); ignora.
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="profileLink">Seu link exclusivo</Label>
      <div className="flex gap-2">
        <Input id="profileLink" type="text" value={shareLink} readOnly className="font-medium" />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleCopy}
          aria-label="Copiar link"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        Esse é o seu endereço público, criado a partir do seu nome de criador.
        Compartilhe com sua audiência.
      </p>
    </div>
  );
}
