"use client";

import { Download, Share } from "lucide-react";
import { useState } from "react";

import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface InstallAppButtonProps {
  className?: string;
  /** `sm` for compact toolbars; `default` for full-width cards. */
  size?: "default" | "sm";
}

/**
 * Mobile-only CTA to install the PWA. Hidden on desktop and when already installed.
 */
export function InstallAppButton({
  className,
  size = "default",
}: InstallAppButtonProps) {
  const { available, iosHint, canPromptInstall, install } = usePwaInstall();
  const [iosDialogOpen, setIosDialogOpen] = useState(false);

  if (!available) return null;

  async function handleClick() {
    if (iosHint) {
      setIosDialogOpen(true);
      return;
    }

    await install();
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size}
        className={cn("md:hidden", size === "default" && "w-full", className)}
        onClick={() => void handleClick()}
        disabled={!iosHint && !canPromptInstall}
      >
        <Download className="size-4" />
        Baixar app
      </Button>

      <Dialog open={iosDialogOpen} onOpenChange={setIosDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar à Tela de Início</DialogTitle>
            <DialogDescription>
              No Safari, toque em{" "}
              <Share className="inline size-4 align-text-bottom" aria-hidden />{" "}
              Compartilhar e depois em &quot;Adicionar à Tela de Início&quot; para
              usar o Vippin como app.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
