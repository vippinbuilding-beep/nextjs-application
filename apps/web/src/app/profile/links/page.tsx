"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ProfileLinksEditor } from "@/components/profile/profile-links-editor";
import { CreatorModuleHeader } from "@/components/creator/creator-module-header";
import { useAuth } from "@/components/providers/auth-provider";
import { useLoginRedirect } from "@/hooks/use-login-redirect";
import {
  Card,
  CardContent,
} from "@vippin/ui/card";
import { ScreenLoading } from "@vippin/ui/screen-loading";
import { isConsumer } from "@/lib/user-role";

export default function ProfileLinksPage() {
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
    if (isConsumer(user)) {
      router.replace("/");
    }
  }, [loading, user, router, redirectToLogin]);

  if (loading || !user || isConsumer(user)) {
    return <ScreenLoading />;
  }

  return (
    <div className="flex flex-col gap-6">
      <CreatorModuleHeader
        title="Meus links"
        description="Crie links para aparecer na aba Links do seu perfil. Ao salvar, o ícone do perfil é baixado e guardado no Vippin."
      />

      <Card>
        <CardContent className="pt-6">
          <ProfileLinksEditor creatorId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
