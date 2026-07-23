"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";

import { AskMeConsumerInbox } from "@/components/ask-me/ask-me-consumer-inbox";
import { BackButton } from "@/components/navigation/back-button";
import { CreatorConsumerQuestionsPanel } from "@/components/creator/creator-consumer-questions-panel";
import { useAuth } from "@/components/providers/auth-provider";
import { useLoginRedirect } from "@/hooks/use-login-redirect";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@vippin/ui/card";
import { LayoutBackground } from "@vippin/ui/layout-background";
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
    <LayoutBackground
      element="main"
      className="flex min-h-svh flex-col items-center justify-center p-4 py-10"
    >
      <Card className="relative w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Minhas perguntas</CardTitle>
          <CardDescription>
            Acompanhe perguntas enviadas a criadores. Se não houver resposta em
            72h, o valor é estornado automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <AskMeConsumerInbox askerId={user.id} />
          <BackButton fallback="/" className="w-full" />
        </CardContent>
      </Card>
    </LayoutBackground>
  );
}
