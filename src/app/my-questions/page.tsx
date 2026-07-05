"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";

import { AskMeConsumerInbox } from "@/components/ask-me/ask-me-consumer-inbox";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useAuth } from "@/components/providers/auth-provider";
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

export default function MyQuestionsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const guard = useCallback(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!user.onboardingCompleted) {
      router.replace("/onboarding");
    }
  }, [loading, user, router]);

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
          <div className="absolute top-4 right-4">
            <NotificationBell />
          </div>
          <CardTitle>Minhas perguntas</CardTitle>
          <CardDescription>
            Acompanhe perguntas enviadas a criadores. Se não houver resposta em
            72h, o valor é estornado para sua chave PIX.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <AskMeConsumerInbox askerId={user.id} />
          <Button type="button" variant="outline" className="w-full" onClick={() => router.back()}>
            Voltar
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/explore">Explorar criadores</Link>
          </Button>
        </CardContent>
      </Card>
    </LayoutBackground>
  );
}
