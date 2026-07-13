"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { CreatorProductsPanel } from "@/components/creator/creator-products-panel";
import { useAuth } from "@/components/providers/auth-provider";
import { useLoginRedirect } from "@/hooks/use-login-redirect";
import { ScreenLoading } from "@vippin/ui/screen-loading";
import { isCreator } from "@/lib/user-role";

export default function CreatorProductsPage() {
  const router = useRouter();
  const redirectToLogin = useLoginRedirect();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      redirectToLogin();
      return;
    }
    if (!user.onboardingCompleted) {
      router.replace("/onboarding");
      return;
    }
    if (!isCreator(user)) {
      router.replace("/");
    }
  }, [loading, user, router, redirectToLogin]);

  if (loading || !user) {
    return <ScreenLoading />;
  }

  return <CreatorProductsPanel />;
}
