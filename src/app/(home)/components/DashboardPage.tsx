"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { CreatorLinkCard } from "@/components/creator/creator-link-card";
import { useAuth } from "@/components/providers/auth-provider";
import { ProductTabs } from "@/components/products/product-tabs";
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
import type { Product } from "@/core/models/product";
import { productRepository } from "@/services/repository-factory";
import { Loading } from "@/components/ui/loading";

export default function DashboardPage() {
    const router = useRouter();
    const { user, loading, signOut } = useAuth();

    const [products, setProducts] = useState<Product[]>([]);
    const [productsLoading, setProductsLoading] = useState(true);

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.replace("/");
        } else if (!user.onboardingCompleted) {
            router.replace("/onboarding");
        }
    }, [loading, user, router]);

    const loadProducts = useCallback(async (creatorId: string) => {
        setProductsLoading(true);
        try {
            const list = await productRepository.listByCreator(creatorId);
            setProducts(list);
        } catch {
            setProducts([]);
        } finally {
            setProductsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!user?.id) return;
        loadProducts(user.id);
    }, [user?.id, loadProducts]);

    if (loading || !user) {
        return <ScreenLoading />;
    }

    const handleSignOut = async () => {
        await signOut();
        router.replace("/");
    };

    return (
        <LayoutBackground
            element="main"
            className="flex min-h-svh flex-col items-center justify-center p-4 py-10"
        >
            <div className="flex w-full max-w-md flex-col gap-6 sm:max-w-2xl">
                <div className="flex items-center justify-end">
                    <Button variant="outline" onClick={handleSignOut}>
                        Sair
                    </Button>
                </div>

                {user.slug && <CreatorLinkCard slug={user.slug} />}

                <Card>
                    <CardHeader>
                        <CardTitle>Seus produtos</CardTitle>
                        <CardDescription>
                            Crie aulas e documentos para vender à sua audiência.
                        </CardDescription>
                        <CardAction>
                            <Button size="sm" onClick={() => router.push("/products/new")}>
                                <Plus className="size-4" /> Novo produto
                            </Button>
                        </CardAction>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">

                        {productsLoading ? (
                            <div className="flex items-center justify-center">
                                <Loading />
                            </div>
                        ) : products.length === 0 ? (
                            <div className="flex items-center justify-center">
                                <p className="text-muted-foreground text-sm">
                                    Você ainda não criou nenhum produto.
                                </p>
                            </div>
                        ) : (
                            <ProductTabs
                                products={products}
                                profile={{ id: user.id, slug: user.slug ?? "" }}
                                mode="manage"
                                emptyLessonsLabel="Você ainda não criou nenhuma aula."
                                emptyDocumentsLabel="Você ainda não criou nenhum documento."
                            />
                        )}
                    </CardContent>
                </Card>
            </div>
        </LayoutBackground>
    );
}
