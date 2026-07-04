"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

import { ProductForm } from "@/components/products/product-form";
import { useAuth } from "@/components/providers/auth-provider";
import { LayoutBackground } from "@/components/ui/layout-background";
import { ScreenLoading } from "@/components/ui/screen-loading";
import { isProductType } from "@/lib/products";

export default function NewProductDetailsPage() {
  const router = useRouter();
  const params = useParams<{ type: string }>();
  const { user, loading } = useAuth();

  const type = params.type;
  const validType = isProductType(type);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (!user.onboardingCompleted) {
      router.replace("/onboarding");
    } else if (!validType) {
      router.replace("/products/new");
    }
  }, [loading, user, validType, router]);

  if (loading || !user || !validType) {
    return <ScreenLoading />;
  }

  return (
    <LayoutBackground element="main" background="primary" className="flex items-center justify-center p-4">
      <ProductForm type={type} />
    </LayoutBackground>
  );
}
