"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";

import { AskMeConsumerInbox } from "@/components/ask-me/ask-me-consumer-inbox";
import { BackButton } from "@/components/navigation/back-button";
import { CreatorConsumerQuestionsPanel } from "@/components/creator/creator-consumer-questions-panel";
import { useAuth } from "@/components/providers/auth-provider";
import { useLoginRedirect } from "@/hooks/use-login-redirect";
import { LayoutBackground } from "@vippin/ui/layout-background";
import { PageHeader, PageShell } from "@vippin/ui/page-shell";
import { ScreenLoading } from "@vippin/ui/screen-loading";
import { isCreator } from "@/lib/user-role";
export default function MyQuestionsPage() {
  const router = useRouter();
  const redirectToLogin = useLoginRedirect();
  const { user, loading } = useAuth();

  const guard = useCallback(() => {
    if (loading) return;
    if (!user) {
      redirectToLogin();
      return;
    }
    if (!user.onboardingCompleted) {
      router.replace("/onboarding");
    }
  }, [loading, user, router, redirectToLogin]);

  useEffect(() => {
    guard();
  }, [guard]);

  if (loading || !user) {
    return <ScreenLoading />;
  }

  // Creators get the dashboard shell's header/nav (via CreatorDashboardGate);
  // this bare panel is meant to render inside it.
  if (isCreator(user)) {
    return <CreatorConsumerQuestionsPanel />;
  }

  return (
    <LayoutBackground element="main" className="flex min-h-svh flex-col">
      <PageShell width="narrow">
        <PageHeader
          title="Minhas perguntas"
          description="Acompanhe as perguntas enviadas a criadores. Se não houver resposta em 72h, o valor volta automaticamente."
          actions={<BackButton fallback="/" />}
        />
        <AskMeConsumerInbox askerId={user.id} />
      </PageShell>
    </LayoutBackground>
  );
}
