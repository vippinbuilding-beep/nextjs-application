"use client";

import { Share, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { SITE_LOGO_PATH, SITE_NAME } from "@/lib/metadata";
import {
  dismissInstallPromptPermanently,
  shouldShowInstallPrompt,
  snoozeInstallPromptOneWeek,
} from "@/lib/pwa/install-prompt-storage";
import {
  type BeforeInstallPromptEvent,
  isIosSafari,
  isStandaloneMode,
} from "@/lib/pwa/device";
import { cn } from "@/lib/utils";

export function InstallAppPrompt() {
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandaloneMode()) return;
    if (!shouldShowInstallPrompt()) return;

    if (isIosSafari()) {
      setIosHint(true);
      setVisible(true);
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      if (!shouldShowInstallPrompt()) return;

      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  function dismissForOneWeek() {
    snoozeInstallPromptOneWeek();
    setVisible(false);
  }

  async function install() {
    dismissInstallPromptPermanently();
    setVisible(false);

    if (!installEvent) return;

    await installEvent.prompt();
    await installEvent.userChoice;
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
        <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-border bg-primary">
          {iosHint ? (
            <Share className="size-5" aria-hidden />
          ) : (
            <Image
              src={SITE_LOGO_PATH}
              alt={SITE_NAME}
              width={40}
              height={40}
              className="size-full object-cover"
            />
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
          onClick={dismissForOneWeek}
          aria-label="Fechar aviso de instalação"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
