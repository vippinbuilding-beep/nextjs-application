"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

import { CreatorPerformancePanel } from "@/components/creator/creator-performance-panel";
import { useAuth } from "@/components/providers/auth-provider";
import { useLoginRedirect } from "@/hooks/use-login-redirect";
import { ScreenLoading } from "@/components/ui/screen-loading";
import { isCreator } from "@/lib/user-role";

function CreatorPerformanceContent() {
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

  return <CreatorPerformancePanel />;
}

export default function CreatorPerformancePage() {
  return (
    <Suspense fallback={<ScreenLoading />}>
      <CreatorPerformanceContent />
    </Suspense>
  );
}
