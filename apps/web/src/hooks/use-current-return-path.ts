"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { buildReturnPath } from "@/lib/auth/login-return";

/** Current page path + query, safe to pass as login `next`. */
export function useCurrentReturnPath(): string {
  const pathname = usePathname();
  const [returnPath, setReturnPath] = useState(pathname);

  useEffect(() => {
    setReturnPath(buildReturnPath(pathname, window.location.search));
  }, [pathname]);

  return returnPath;
}
