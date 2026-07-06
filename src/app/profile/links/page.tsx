"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { LayoutDashboard } from "lucide-react";

import { ProfileLinksEditor } from "@/components/profile/profile-links-editor";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LayoutBackground } from "@/components/ui/layout-background";
import { ScreenLoading } from "@/components/ui/screen-loading";
import { isConsumer } from "@/lib/user-role";

export default function ProfileLinksPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!user.onboardingCompleted) {
      router.replace("/onboarding");
      return;
    }
    if (isConsumer(user)) {
      router.replace("/");
    }
  }, [loading, user, router]);

  if (loading || !user || isConsumer(user)) {
    return <ScreenLoading />;
  }

  return (
    <LayoutBackground
      element="main"
      background="primary"
      className="flex min-h-svh flex-col items-center justify-center p-4 py-10"
    >
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Meus links</CardTitle>
          <CardDescription>
            Crie links personalizados com título e imagem como um Linktree
            para aparecer na aba Links do seu perfil público.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ProfileLinksEditor creatorId={user.id} />

          <div className="mt-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => router.back()}
            >
              Voltar
            </Button>
          </div>
        </CardContent>
      </Card>
    </LayoutBackground>
  );
}
