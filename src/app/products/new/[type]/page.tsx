"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

import { ProductForm } from "@/components/products/product-form";
import { useAuth } from "@/components/providers/auth-provider";
import { useLoginRedirect } from "@/hooks/use-login-redirect";
import { LayoutBackground } from "@/components/ui/layout-background";
import { ScreenLoading } from "@/components/ui/screen-loading";
import { isCreator } from "@/lib/user-role";
import { isProductType } from "@/lib/products";

export default function NewProductDetailsPage() {
  const router = useRouter();
  const redirectToLogin = useLoginRedirect();
  const params = useParams<{ type: string }>();
  const { user, loading } = useAuth();

  const type = params.type;
  const validType = isProductType(type);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      redirectToLogin();
    } else if (!user.onboardingCompleted) {
      router.replace("/onboarding");
    } else if (!isCreator(user)) {
      router.replace("/");
    } else if (!validType) {
      router.replace("/products/new");
    }
  }, [loading, user, validType, router, redirectToLogin]);

  if (loading || !user || !validType) {
    return <ScreenLoading />;
  }

  return (
    <LayoutBackground element="main" background="primary" className="flex items-center justify-center p-4">
      <ProductForm type={type} />
    </LayoutBackground>
  );
}
