"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  canNavigateBack,
  trackPathnameChange,
} from "@/lib/navigation/in-app-navigation";
import { hasSameOriginReferrer } from "@/lib/navigation/navigate-back";

/** Whether the user can go back within this app session (client-only). */
export function useCanGoBack(enabled = true): boolean {
  const pathname = usePathname();
  const [canGoBack, setCanGoBack] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    trackPathnameChange(pathname);
    setCanGoBack(canNavigateBack(hasSameOriginReferrer()));
  }, [enabled, pathname]);

  return enabled ? canGoBack : true;
}
