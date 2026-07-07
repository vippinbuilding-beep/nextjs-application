"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { navigateBack } from "@/lib/navigation/navigate-back";

export function useNavigateBack() {
  const router = useRouter();

  return useCallback(
    (fallback: string) => {
      navigateBack(router, fallback);
    },
    [router]
  );
}
