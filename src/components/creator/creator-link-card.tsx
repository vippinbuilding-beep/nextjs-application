"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CreatorLinkCardProps {
  slug: string;
}

/**
 * Shows the creator's public link (/@slug) with copy and open actions.
 */
export function CreatorLinkCard({ slug }: CreatorLinkCardProps) {
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const path = `/@${slug}`;
  const link = `${origin}${path}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard pode estar indisponível; ignora.
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seu link de criador</CardTitle>
        <CardDescription>
          Compartilhe com sua audiência para divulgar seus produtos.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <a
          href={path}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-2 rounded-xl border-2 border-border bg-primary px-3.5 py-2.5 font-bold text-primary-foreground shadow-cartoon-sm transition-all hover:-translate-y-0.5 hover:shadow-cartoon"
        >
          <span className="truncate">
            <span className="opacity-70">{origin.replace(/^https?:\/\//, "")}</span>
            {path}
          </span>
          <ExternalLink className="size-4 shrink-0" />
        </a>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="size-4" /> Copiado!
            </>
          ) : (
            <>
              <Copy className="size-4" /> Copiar link
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
