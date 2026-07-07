"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

import { CreatorModuleHeader } from "@/components/creator/creator-module-header";
import { ProductForm } from "@/components/products/product-form";
import { useAuth } from "@/components/providers/auth-provider";
import { useLoginRedirect } from "@/hooks/use-login-redirect";
import { ScreenLoading } from "@/components/ui/screen-loading";
import { isCreator } from "@/lib/user-role";
import { isProductType, PRODUCT_TYPES } from "@/lib/products";

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
    <div className="flex flex-col gap-6">
      <CreatorModuleHeader
        title="Novo produto"
        description={PRODUCT_TYPES[type].description}
      />
      <ProductForm type={type} />
    </div>
  );
}
