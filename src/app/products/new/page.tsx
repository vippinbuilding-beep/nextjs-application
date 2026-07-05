"use client";

import { ArrowLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

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
import type { ProductType } from "@/core/models/product";
import { isCreator } from "@/lib/user-role";
import { PRODUCT_TYPES } from "@/lib/products";
import ProductTypeIcon from "@/components/icons/ProductTypeIcon";

export default function NewProductPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (!user.onboardingCompleted) {
      router.replace("/onboarding");
    } else if (!isCreator(user)) {
      router.replace("/");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <ScreenLoading />;
  }

  return (
    <LayoutBackground
      element="main"
      background="primary"
      className="flex min-h-svh flex-col items-center justify-center p-4 py-10"
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Qual tipo de produto?</CardTitle>
          <CardDescription>
            Escolha o formato do produto que você quer criar.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {(Object.keys(PRODUCT_TYPES) as ProductType[]).map((type) => {
            const config = PRODUCT_TYPES[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => router.push(`/products/new/${type}`)}
                className="flex items-center gap-3 rounded-xl border-2 border-border bg-background px-4 py-4 text-left shadow-cartoon-sm transition-all hover:-translate-y-0.5 hover:shadow-cartoon cursor-pointer"
              >
                <ProductTypeIcon type={type} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-bold">{config.label}</span>
                  <span className="text-muted-foreground text-xs font-medium">
                    {config.description}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0" />
              </button>
            );
          })}

          <Button
            type="button"
            variant="outline"
            className="mt-2 w-full"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="size-4" /> Voltar
          </Button>
        </CardContent>
      </Card>
    </LayoutBackground>
  );
}
