"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { useAuth } from "@/components/providers/auth-provider";
import { LayoutBackground } from "@/components/ui/layout-background";
import { ScreenLoading } from "@/components/ui/screen-loading";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    } else if (!loading && user?.onboardingCompleted) {
      router.replace("/");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <ScreenLoading title="Preparando seu cadastro" description="Só um instante enquanto carregamos tudo." />;
  }

  return (
    <LayoutBackground element="main" background="primary" className="flex items-center justify-center p-4">
      <OnboardingForm />
    </LayoutBackground>
  );
}
