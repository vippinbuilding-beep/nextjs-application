"use client";

import { usePathname } from "next/navigation";

import { AppHeader } from "@/components/navigation/app-header";
import { useAuth } from "@/components/providers/auth-provider";
import { isCreatorShellPath } from "@/lib/creator-dashboard/paths";
import { isCreator } from "@/lib/user-role";

const APP_HEADER_PATTERN =
  /^\/(my-products|my-questions|profile(\/|$)|products(\/|$))(\/.*)?$/;

const HIDDEN_HEADER_PATTERN = /^\/(login|onboarding)(\/|$)/;

export function AppNavigation() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (HIDDEN_HEADER_PATTERN.test(pathname)) {
    return null;
  }

  if (isCreatorShellPath(pathname) && user && isCreator(user)) {
    return null;
  }

  if (!APP_HEADER_PATTERN.test(pathname)) {
    return null;
  }

  if (loading) {
    return <AppHeader loading />;
  }

  if (!user) {
    return null;
  }

  return <AppHeader />;
}
