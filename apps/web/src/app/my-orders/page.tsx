"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { CreatorModuleHeader } from "@/components/creator/creator-module-header";
import { BackButton } from "@/components/navigation/back-button";
import { useAuth } from "@/components/providers/auth-provider";
import { BuyerOrdersList } from "@/components/shipping/buyer-orders-list";
import { useLoginRedirect } from "@/hooks/use-login-redirect";
import { Card, CardContent } from "@vippin/ui/card";
import { LayoutBackground } from "@vippin/ui/layout-background";
import { PageHeader, PageShell } from "@vippin/ui/page-shell";
import { ScreenLoading } from "@vippin/ui/screen-loading";
import { isCreator } from "@/lib/user-role";

export default function MyOrdersPage() {
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
    }
  }, [loading, user, router, redirectToLogin]);

  if (loading || !user) {
    return <ScreenLoading />;
  }

  // Creators see it inside the dashboard shell (CreatorDashboardGate).
  if (isCreator(user)) {
    return (
      <div className="flex flex-col gap-6">
        <CreatorModuleHeader
          title="Meus pedidos"
          description="Produtos físicos que você comprou."
        />
        <Card>
          <CardContent>
            <BuyerOrdersList />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <LayoutBackground element="main" className="flex min-h-svh flex-col">
      <PageShell width="narrow">
        <PageHeader
          title="Meus pedidos"
          description="Produtos físicos que você comprou, com status e rastreio."
          actions={<BackButton fallback="/" />}
        />
        <BuyerOrdersList />
      </PageShell>
    </LayoutBackground>
  );
}
