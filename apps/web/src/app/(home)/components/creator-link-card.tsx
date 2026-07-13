"use client";

import { Check, Copy, ExternalLink, Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@vippin/ui/button";
import { formatCreatorShareLink, stripUrlProtocol } from "@/lib/metadata";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@vippin/ui/card";

interface CreatorLinkCardProps {
  slug: string;
}

export function CreatorLinkCard({ slug }: CreatorLinkCardProps) {
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const path = `/@${slug}`;
  const shareLink = formatCreatorShareLink(slug, origin);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard pode estar indisponível; ignora.
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Seu link público</CardTitle>
        <CardDescription>
          Compartilhe com sua audiência para vender produtos e receber perguntas.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Link
          href={path}
          className="flex items-center justify-between gap-2 rounded-xl border-2 border-border bg-primary px-3.5 py-3 font-bold text-primary-foreground shadow-cartoon-sm transition-all hover:-translate-y-0.5 hover:shadow-cartoon sm:px-4 sm:py-3.5"
        >
          <span className="min-w-0 truncate text-sm sm:text-base">
            <span className="opacity-70">{stripUrlProtocol(origin)}</span>
            {path}
          </span>
          <ExternalLink className="size-4 shrink-0" />
        </Link>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void handleCopy()}
          >
            {copied ? (
              <>
                <Check className="size-4" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="size-4" />
                Copiar
              </>
            )}
          </Button>
          <Button type="button" variant="outline" className="w-full" asChild>
            <Link href="/profile/edit">
              <Pencil className="size-4" />
              Perfil
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
