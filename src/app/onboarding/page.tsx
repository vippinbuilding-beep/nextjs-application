"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { ConsumerOnboardingForm } from "@/components/onboarding/consumer-onboarding-form";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { useAuth } from "@/components/providers/auth-provider";
import { useLoginRedirect } from "@/hooks/use-login-redirect";
import { LayoutBackground } from "@/components/ui/layout-background";
import { ScreenLoading } from "@/components/ui/screen-loading";
import { safeReturnPath } from "@/lib/auth/login-return";
import { isConsumer } from "@/lib/user-role";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectToLogin = useLoginRedirect();
  const { user, loading, refreshUser } = useAuth();
  const returnTo = safeReturnPath(searchParams.get("next")) ?? "/";
  const [profileSynced, setProfileSynced] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void refreshUser().finally(() => {
      if (!cancelled) setProfileSynced(true);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  useEffect(() => {
    if (!profileSynced || loading) return;
    if (!user) {
      redirectToLogin();
    } else if (user.onboardingCompleted) {
      router.replace(returnTo);
    }
  }, [profileSynced, loading, user, router, redirectToLogin, returnTo]);

  if (!profileSynced || loading || !user) {
    return (
      <ScreenLoading
        title="Preparando seu cadastro"
        description="Só um instante enquanto carregamos tudo."
      />
    );
  }

  return (
    <LayoutBackground
      element="main"
      background="primary"
      className="flex items-center justify-center p-4"
    >
      {isConsumer(user) ? (
        <ConsumerOnboardingForm returnTo={returnTo} />
      ) : (
        <OnboardingForm returnTo={returnTo} />
      )}
    </LayoutBackground>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <ScreenLoading
          title="Preparando seu cadastro"
          description="Só um instante enquanto carregamos tudo."
        />
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
