"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { CreatorModuleHeader } from "@/components/creator/creator-module-header";
import { useAuth } from "@/components/providers/auth-provider";
import { CreatorShipmentsPanel } from "@/components/shipping/creator-shipments-panel";
import { ShipFromForm } from "@/components/shipping/ship-from-form";
import { useLoginRedirect } from "@/hooks/use-login-redirect";
import { ScreenLoading } from "@vippin/ui/screen-loading";
import { isCreator } from "@/lib/user-role";

export default function CreatorShipmentsPage() {
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

  return (
    <div className="flex flex-col gap-6">
      <CreatorModuleHeader
        title="Envios"
        description="Pedidos de produtos físicos, etiquetas e rastreio."
      />
      <CreatorShipmentsPanel />
      <ShipFromForm />
    </div>
  );
}
