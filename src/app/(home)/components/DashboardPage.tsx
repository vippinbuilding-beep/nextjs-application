"use client";

import {
    Banknote,
    BarChart3,
    ChevronRight,
    Compass,
    Library,
    Link2,
    MessageCircleQuestion,
    Package,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { CreatorLinkCard } from "@/app/(home)/components/creator-link-card";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { CreatorModuleHeader } from "@/components/creator/creator-module-header";
import { ProfileDefaultTabPicker } from "@/components/profile/profile-default-tab-picker";
import { useAuth } from "@/components/providers/auth-provider";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { CountBadge } from "@/components/ui/count-badge";
import { ScreenLoading } from "@/components/ui/screen-loading";
import type { Product } from "@/core/models/product";
import { getAvailableCreatorTabs } from "@/lib/creator-profile-tabs";
import { supabase } from "@/lib/supabase/client";
import { isCreator } from "@/lib/user-role";
import { cn } from "@/lib/utils";
import {
    productAccessRepository,
    productRepository,
    profileLinkRepository,
} from "@/services/repository-factory";
import { useCreatorPendingAskMe } from "@/hooks/use-creator-pending-ask-me";

export default function DashboardPage() {
    const router = useRouter();
    const { user, loading, refreshUser } = useAuth();

    const [products, setProducts] = useState<Product[]>([]);
    const [productsLoading, setProductsLoading] = useState(true);
    const [libraryCount, setLibraryCount] = useState(0);
    const [libraryLoading, setLibraryLoading] = useState(true);
    const [linkCount, setLinkCount] = useState(0);
    const [linksLoading, setLinksLoading] = useState(true);
    const pendingAskMe = useCreatorPendingAskMe(user?.id);

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

    const loadLinks = useCallback(async (creatorId: string) => {
        setLinksLoading(true);
        try {
            const links = await profileLinkRepository.listByCreator(creatorId);
            setLinkCount(links.length);
        } catch {
            setLinkCount(0);
        } finally {
            setLinksLoading(false);
        }
    }, []);

    const loadLibrary = useCallback(async () => {
        setLibraryLoading(true);
        try {
            const productIds = await productAccessRepository.listProductIdsForCurrentUser();
            setLibraryCount(productIds.length);
        } catch {
            setLibraryCount(0);
        } finally {
            setLibraryLoading(false);
        }
    }, []);

    const refreshDashboardRef = useRef<(creatorId: string) => void>(() => { });

    useEffect(() => {
        refreshDashboardRef.current = (creatorId: string) => {
            void loadProducts(creatorId);
            void loadLinks(creatorId);
            void loadLibrary();
        };
    }, [loadProducts, loadLinks, loadLibrary]);

    useEffect(() => {
        if (!user?.id) return;
        refreshDashboardRef.current(user.id);
    }, [user?.id]);

    useEffect(() => {
        const creatorId = user?.id;
        if (!creatorId) return;

        const stableCreatorId = creatorId;

        const channel = supabase
            .channel(`dashboard-ask-me:${stableCreatorId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "ask_me_questions",
                    filter: `creator_id=eq.${stableCreatorId}`,
                },
                () => {
                    refreshDashboardRef.current(stableCreatorId);
                }
            )
            .subscribe();

        function handleVisibilityChange() {
            if (document.visibilityState === "visible") {
                refreshDashboardRef.current(stableCreatorId);
            }
        }

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            void supabase.removeChannel(channel);
        };
    }, [user?.id]);

    if (loading || !user) {
        return <ScreenLoading />;
    }

    const displayName = user.name ?? user.creatorName ?? "Criador";
    const lessonCount = products.filter((p) => p.type === "single_lesson").length;
    const documentCount = products.filter((p) => p.type === "document").length;
    const availableTabs = getAvailableCreatorTabs({
        hasLinks: linkCount > 0,
        hasLessons: lessonCount > 0,
        hasDocuments: documentCount > 0,
    });
    const showDefaultTabPicker =
        availableTabs.length > 1 && !productsLoading && !linksLoading;

    return (
        <div className="flex flex-col gap-6">
            <CreatorModuleHeader
                title={`Olá, ${displayName}`}
                description="Resumo do seu painel e atalhos para cada área."
            />
            <InstallAppButton />

            <div className="flex flex-wrap gap-2">
                <StatPill label={`${products.length} produto${products.length === 1 ? "" : "s"}`} />
                {lessonCount > 0 && (
                    <StatPill label={`${lessonCount} aula${lessonCount === 1 ? "" : "s"}`} />
                )}
                {documentCount > 0 && (
                    <StatPill label={`${documentCount} vip${documentCount === 1 ? "" : "s"}`} />
                )}
                {pendingAskMe > 0 && (
                    <StatPill
                        label={`${pendingAskMe} pergunta${pendingAskMe === 1 ? "" : "s"} pendente${pendingAskMe === 1 ? "" : "s"}`}
                        highlight
                    />
                )}
            </div>


            {showDefaultTabPicker && (
                <Card>
                    <CardContent >
                        <ProfileDefaultTabPicker
                            userId={user.id}
                            value={user.profileDefaultTab}
                            availableTabs={availableTabs}
                            onSaved={() => void refreshUser()}
                        />
                    </CardContent>
                </Card>
            )}

            {user.slug && <CreatorLinkCard slug={user.slug} />}

            <section className="grid gap-3 sm:grid-cols-2">
                <ModuleCard
                    href="/painel/desempenho"
                    icon={BarChart3}
                    title="Desempenho"
                    description="Receita, vendas e Me pergunte"
                />
                <ModuleCard
                    href="/painel/produtos"
                    icon={Package}
                    title="Produtos"
                    description={`${products.length} no catálogo`}
                />
                <ModuleCard
                    href="/profile/ask-me"
                    icon={MessageCircleQuestion}
                    title="Me pergunte"
                    description={
                        pendingAskMe > 0
                            ? `${pendingAskMe} aguardando resposta`
                            : "Perguntas pagas da audiência"
                    }
                    badgeCount={pendingAskMe}
                />
                <ModuleCard
                    href="/profile/links"
                    icon={Link2}
                    title="Links"
                    description="Links personalizados no perfil"
                />
                <ModuleCard
                    href="/painel/financeiro"
                    icon={Banknote}
                    title="Financeiro"
                    description="Saldo e saques via PIX"
                />
            </section>

            <section className="flex flex-col gap-3">
                <h2 className="text-muted-foreground text-xs font-bold uppercase tracking-wide">
                    Como comprador
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                    <ModuleCard
                        href="/painel/biblioteca"
                        icon={Library}
                        title="Biblioteca"
                        description={
                            libraryLoading
                                ? "Carregando…"
                                : libraryCount > 0
                                  ? `${libraryCount} produto${libraryCount === 1 ? "" : "s"} adquirido${libraryCount === 1 ? "" : "s"}`
                                  : "Acesse o que você comprou ou recebeu"
                        }
                    />
                    <ModuleCard
                        href="/painel/minhas-perguntas"
                        icon={MessageCircleQuestion}
                        title="Minhas perguntas"
                        description="Perguntas pagas enviadas a criadores"
                    />
                    <ModuleCard
                        href="/explore"
                        icon={Compass}
                        title="Explorar produtos"
                        description="Descubra aulas e materiais de outros criadores"
                    />
                </div>
            </section>
        </div>
    );
}

function StatPill({
    label,
    highlight = false,
}: {
    label: string;
    highlight?: boolean;
}) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full border-2 border-border px-3 py-1 text-xs font-bold shadow-cartoon-sm",
                highlight ? "bg-primary text-primary-foreground" : "bg-background"
            )}
        >
            {label}
        </span>
    );
}

interface ModuleCardProps {
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    badgeCount?: number;
}

function ModuleCard({
    href,
    icon: Icon,
    title,
    description,
    badgeCount = 0,
}: ModuleCardProps) {
    return (
        <Link
            href={href}
            className="group flex items-center gap-3 rounded-xl border-2 border-border bg-background p-4 text-left shadow-cartoon-sm transition-all hover:-translate-y-0.5 hover:shadow-cartoon"
        >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-primary shadow-cartoon-sm">
                <Icon className="size-5" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-bold leading-tight">{title}</span>
                <span className="text-muted-foreground text-xs font-medium leading-snug">
                    {description}
                </span>
            </span>
            <span className="relative shrink-0">
                <ChevronRight className="text-muted-foreground size-5 transition-transform group-hover:translate-x-0.5" />
                <CountBadge count={badgeCount} />
            </span>
        </Link>
    );
}
