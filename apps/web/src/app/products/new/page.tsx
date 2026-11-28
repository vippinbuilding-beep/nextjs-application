"use client";

import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CreatorModuleHeader } from "@/components/creator/creator-module-header";
import { useAuth } from "@/components/providers/auth-provider";
import { useLoginRedirect } from "@/hooks/use-login-redirect";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@vippin/ui/card";
import { ScreenLoading } from "@vippin/ui/screen-loading";
import type { ProductType } from "@vippin/core/models/product";
import { isCreator } from "@/lib/user-role";
import { PRODUCT_TYPES } from "@/lib/products";
import ProductTypeIcon from "@/components/icons/ProductTypeIcon";
import { fetchShipFromStatus } from "@/components/shipping/ship-from-form";

export default function NewProductPage() {
  const router = useRouter();
  const redirectToLogin = useLoginRedirect();
  const { user, loading } = useAuth();
  const [physicalAllowed, setPhysicalAllowed] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchShipFromStatus()
      .then((status) => setPhysicalAllowed(status.allowed))
      .catch(() => setPhysicalAllowed(false));
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      redirectToLogin();
    } else if (!user.onboardingCompleted) {
      router.replace("/onboarding");
    } else if (!isCreator(user)) {
      router.replace("/");
    }
  }, [loading, user, router, redirectToLogin]);

  if (loading || !user) {
    return <ScreenLoading />;
  }

  return (
    <div className="flex flex-col gap-6">
      <CreatorModuleHeader
        title="Novo produto"
        description="Escolha o tipo de conteúdo que quer publicar."
      />

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Qual tipo de produto?</CardTitle>
          <CardDescription>
            Escolha o formato do produto que você quer criar.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {(Object.keys(PRODUCT_TYPES) as ProductType[])
            .filter((type) => type !== "physical" || physicalAllowed)
            .map((type) => {
            const config = PRODUCT_TYPES[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => router.push(`/products/new/${type}`)}
                className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-4 text-left shadow-elevated-sm transition-all hover:-translate-y-0.5 hover:shadow-elevated cursor-pointer"
              >
                <ProductTypeIcon type={type} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold">{config.label}</span>
                  <span className="text-muted-foreground text-xs font-medium">
                    {config.description}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0" />
              </button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
