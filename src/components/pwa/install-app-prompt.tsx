"use client";

import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "vippin:pwa-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function isIosSafari() {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);

  return isIOS && isSafari;
}

export function InstallAppPrompt() {
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandaloneMode()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    if (isIosSafari()) {
      setIosHint(true);
      setVisible(true);
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  async function install() {
    if (!installEvent) return;

    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;

    if (outcome === "accepted") {
      setVisible(false);
      return;
    }

    dismiss();
  }

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
      )}
      role="region"
      aria-label="Instalar aplicativo"
    >
      <div className="flex w-full max-w-md items-start gap-3 rounded-2xl border-2 border-border bg-background p-4 shadow-cartoon-lg">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-primary">
          {iosHint ? (
            <Share className="size-5" aria-hidden />
          ) : (
            <Download className="size-5" aria-hidden />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <p className="font-semibold leading-tight">Instale o Vippin</p>
            <p className="text-sm text-muted-foreground">
              {iosHint
                ? "Toque em Compartilhar e depois em Adicionar à Tela de Início para usar como app."
                : "Adicione à tela inicial para acesso rápido, como um app nativo."}
            </p>
          </div>

          {!iosHint && (
            <Button type="button" size="sm" onClick={() => void install()}>
              Instalar app
            </Button>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={dismiss}
          aria-label="Fechar aviso de instalação"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
