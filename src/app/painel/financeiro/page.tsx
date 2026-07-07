"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { CreatorModuleHeader } from "@/components/creator/creator-module-header";
import { CreatorWithdrawCard } from "@/components/creator/creator-withdraw-card";
import { useAuth } from "@/components/providers/auth-provider";
import { useLoginRedirect } from "@/hooks/use-login-redirect";
import { ScreenLoading } from "@/components/ui/screen-loading";
import { creatorFinancePageDescription } from "@/lib/payments/platform-fee";
import { isCreator } from "@/lib/user-role";

export default function CreatorFinancePage() {
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

  return (
    <div className="flex flex-col gap-6">
      <CreatorModuleHeader
        title="Financeiro"
        description={creatorFinancePageDescription()}
      />
      <CreatorWithdrawCard />
    </div>
  );
}
