"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ConsumerOnboardingForm } from "@/components/onboarding/consumer-onboarding-form";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { useAuth } from "@/components/providers/auth-provider";
import { useLoginRedirect } from "@/hooks/use-login-redirect";
import { LayoutBackground } from "@/components/ui/layout-background";
import { ScreenLoading } from "@/components/ui/screen-loading";
import { isConsumer } from "@/lib/user-role";

export default function OnboardingPage() {
  const router = useRouter();
  const redirectToLogin = useLoginRedirect();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      redirectToLogin();
    } else if (!loading && user?.onboardingCompleted) {
      router.replace("/");
    }
  }, [loading, user, router, redirectToLogin]);

  if (loading || !user) {
    return <ScreenLoading title="Preparando seu cadastro" description="Só um instante enquanto carregamos tudo." />;
  }

  return (
    <LayoutBackground element="main" background="primary" className="flex items-center justify-center p-4">
      {isConsumer(user) ? <ConsumerOnboardingForm /> : <OnboardingForm />}
    </LayoutBackground>
  );
}
