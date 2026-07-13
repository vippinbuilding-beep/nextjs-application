"use client";

import { useCallback, useEffect, useState } from "react";

import { dismissInstallPromptPermanently } from "@/lib/pwa/install-prompt-storage";
import {
  type BeforeInstallPromptEvent,
  isIosSafari,
  isStandaloneMode,
} from "@/lib/pwa/device";

export function usePwaInstall() {
  const [available, setAvailable] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandaloneMode()) return;

    if (isIosSafari()) {
      setIosHint(true);
      setAvailable(true);
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setAvailable(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  const install = useCallback(async () => {
    if (!installEvent) return false;

    dismissInstallPromptPermanently();
    await installEvent.prompt();
    await installEvent.userChoice;
    return true;
  }, [installEvent]);

  return {
    available,
    iosHint,
    canPromptInstall: Boolean(installEvent),
    install,
  };
}
