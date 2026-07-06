"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";

import { buildLoginUrl } from "@/lib/auth/login-url";

export function useLoginRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(() => {
    router.replace(buildLoginUrl({ next: pathname }));
  }, [router, pathname]);
}
