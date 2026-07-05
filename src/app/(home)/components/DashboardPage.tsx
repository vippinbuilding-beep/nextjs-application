"use client";

import { Check, Copy, ExternalLink, MessageCircleQuestion, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { NotificationBell } from "@/components/notifications/notification-bell";
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
import { isCreator } from "@/lib/user-role";
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
        } else if (!isCreator(user)) {
            router.replace("/");
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
            background="primary"
            className="flex min-h-svh flex-col items-center justify-center p-4 py-10"
        >
            <div className="flex w-full max-w-md flex-col gap-6 sm:max-w-2xl">
                <div className="flex justify-end">
                    <NotificationBell />
                </div>

                {user.slug && <CreatorLinkCard slug={user.slug} handleSignOut={handleSignOut} />}

                <Card>
                    <CardHeader>
                        <CardTitle>Me pergunte</CardTitle>
                        <CardDescription>
                            Receba perguntas pagas da sua audiência. O valor fica
                            retido até você responder em até 72h.
                        </CardDescription>
                        <CardAction>
                            <Button size="sm" variant="outline" asChild>
                                <Link href="/profile/ask-me">
                                    <MessageCircleQuestion className="size-4" /> Gerenciar
                                </Link>
                            </Button>
                        </CardAction>
                    </CardHeader>
                </Card>

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
                        ) : (
                            <ProductTabs
                                products={products}
                                profile={{ id: user.id, slug: user.slug ?? "" }}
                                mode="manage"
                                emptyLessonsLabel="Você ainda não criou nenhuma aula."
                                emptyDocumentsLabel="Você ainda não criou nenhum documento."
                                emptyAllLabel="Você ainda não criou nenhum aula ou documento."
                            />
                        )}
                    </CardContent>
                </Card>
            </div>
        </LayoutBackground>
    );
}

interface CreatorLinkCardProps {
    slug: string;
    handleSignOut: () => void;
}


export function CreatorLinkCard({ slug, handleSignOut }: CreatorLinkCardProps) {
    const [copied, setCopied] = useState(false);

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const path = `/@${slug}`;
    const link = `${origin}${path}`;

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard pode estar indisponível; ignora.
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Seu link de criador</CardTitle>
                <CardDescription>
                    Compartilhe com sua audiência para divulgar seus produtos.
                </CardDescription>
                <CardAction className="flex gap-2 flex-col sm:flex-row">
                    <Button size="sm" variant="outline" asChild>
                        <Link href="/profile/edit">
                            <Pencil className="size-4" /> Editar perfil
                        </Link>
                    </Button>
                    <Button variant="outline" onClick={handleSignOut}>
                        Sair
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                <a
                    href={path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 rounded-xl border-2 border-border bg-primary px-3.5 py-2.5 font-bold text-primary-foreground shadow-cartoon-sm transition-all hover:-translate-y-0.5 hover:shadow-cartoon"
                >
                    <span className="truncate">
                        <span className="opacity-70">{origin.replace(/^https?:\/\//, "")}</span>
                        {path}
                    </span>
                    <ExternalLink className="size-4 shrink-0" />
                </a>
                <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleCopy}
                >
                    {copied ? (
                        <>
                            <Check className="size-4" /> Copiado!
                        </>
                    ) : (
                        <>
                            <Copy className="size-4" /> Copiar link
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}