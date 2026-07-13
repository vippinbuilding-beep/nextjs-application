"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CreatorModuleHeader } from "@/components/creator/creator-module-header";
import { ProductForm } from "@/components/products/product-form";
import { useAuth } from "@/components/providers/auth-provider";
import { useLoginRedirect } from "@/hooks/use-login-redirect";
import { ScreenLoading } from "@vippin/ui/screen-loading";
import type { Product } from "@vippin/core/models/product";
import { PRODUCT_TYPES } from "@/lib/products";
import { isCreator } from "@/lib/user-role";
import { productRepository } from "@vippin/supabase/factories/repository-factory";

export default function EditProductPage() {
  const router = useRouter();
  const redirectToLogin = useLoginRedirect();
  const params = useParams<{ id: string }>();
  const { user, loading } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [fetching, setFetching] = useState(true);

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
      return;
    }

    let active = true;
    (async () => {
      try {
        const found = await productRepository.getById(params.id);
        if (!active) return;
        if (!found || found.creatorId !== user.id) {
          router.replace("/");
          return;
        }
        setProduct(found);
      } catch {
        if (active) router.replace("/");
      } finally {
        if (active) setFetching(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [loading, user, params.id, router, redirectToLogin]);

  if (loading || !user || fetching || !product) {
    return <ScreenLoading />;
  }

  return (
    <div className="flex flex-col gap-6">
      <CreatorModuleHeader
        title="Editar produto"
        description={PRODUCT_TYPES[product.type].label}
      />
      <ProductForm type={product.type} product={product} />
    </div>
  );
}
