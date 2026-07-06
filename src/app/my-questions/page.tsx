"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";

import { AskMeConsumerInbox } from "@/components/ask-me/ask-me-consumer-inbox";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useAuth } from "@/components/providers/auth-provider";
import { useLoginRedirect } from "@/hooks/use-login-redirect";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LayoutBackground } from "@/components/ui/layout-background";
import { ScreenLoading } from "@/components/ui/screen-loading";
import { ArrowLeft } from "lucide-react";

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
            72h, o valor é estornado para sua chave PIX.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <AskMeConsumerInbox askerId={user.id} />
          <Button size="sm" variant="outline" className="w-full" onClick={() => router.back()}>
            <ArrowLeft className="size-4" />
            Voltar
          </Button>
        </CardContent>
      </Card>
    </LayoutBackground>
  );
}
