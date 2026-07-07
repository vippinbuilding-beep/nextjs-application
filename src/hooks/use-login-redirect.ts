"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { buildLoginUrl } from "@/lib/auth/login-url";
import { buildReturnPath, persistLoginReturnPath } from "@/lib/auth/login-return";

export function useLoginRedirect() {
  const router = useRouter();

  return useCallback(() => {
    const returnPath = buildReturnPath(
      window.location.pathname,
      window.location.search
    );
    persistLoginReturnPath(returnPath);
    router.replace(buildLoginUrl({ next: returnPath }));
  }, [router]);
}
