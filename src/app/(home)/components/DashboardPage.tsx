"use client";

import {
    Check,
    ChevronRight,
    Copy,
    ExternalLink,
    Link2,
    LogOut,
    MessageCircleQuestion,
    Pencil,
    Plus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ProfileDefaultTabPicker } from "@/components/profile/profile-default-tab-picker";
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
import { CountBadge } from "@/components/ui/count-badge";
import { LayoutBackground } from "@/components/ui/layout-background";
import { Loading } from "@/components/ui/loading";
import { ScreenLoading } from "@/components/ui/screen-loading";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { Product } from "@/core/models/product";
import { getAvailableCreatorTabs } from "@/lib/creator-profile-tabs";
import { supabase } from "@/lib/supabase/client";
import { isCreator } from "@/lib/user-role";
import { cn } from "@/lib/utils";
import {
    askMeQuestionRepository,
    productRepository,
    profileLinkRepository,
} from "@/services/repository-factory";

export default function DashboardPage() {
    const router = useRouter();
    const { user, loading, signOut, refreshUser } = useAuth();

    const [products, setProducts] = useState<Product[]>([]);
    const [productsLoading, setProductsLoading] = useState(true);
    const [linkCount, setLinkCount] = useState(0);
    const [linksLoading, setLinksLoading] = useState(true);
    const [pendingAskMe, setPendingAskMe] = useState(0);

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

    const loadPendingAskMe = useCallback(async (creatorId: string) => {
        try {
            const count =
                await askMeQuestionRepository.countAwaitingResponseByCreator(creatorId);
            setPendingAskMe(count);
        } catch {
            setPendingAskMe(0);
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

    const refreshDashboardRef = useRef<(creatorId: string) => void>(() => { });

    useEffect(() => {
        refreshDashboardRef.current = (creatorId: string) => {
            void loadProducts(creatorId);
            void loadPendingAskMe(creatorId);
            void loadLinks(creatorId);
        };
    }, [loadProducts, loadPendingAskMe, loadLinks]);

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
                    void loadPendingAskMe(stableCreatorId);
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
    }, [user?.id, loadPendingAskMe]);

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

    async function handleSignOut() {
        await signOut();
        router.replace("/");
    }

    return (
        <LayoutBackground
            element="main"
            dotsOpacity={0.2}
            className="flex min-h-svh flex-col justify-center items-center p-4 py-6 sm:py-10"
        >
            <div className="flex w-full max-w-4xl flex-col gap-4 sm:gap-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                        <UserAvatar
                            userId={user.id}
                            name={displayName}
                            avatarPath={user.avatarPath}
                            avatarUrl={user.avatarUrl}
                            size="lg"
                            className="shrink-0"
                        />
                        <div className="min-w-0">
                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide sm:text-sm">
                                Painel do criador
                            </p>
                            <h1 className="truncate text-xl font-bold sm:text-2xl">
                                Olá, {displayName}
                            </h1>
                            {user.slug && (
                                <p className="text-muted-foreground truncate text-sm font-medium">
                                    @{user.slug}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <NotificationBell />
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void handleSignOut()}
                            className="hidden sm:inline-flex"
                        >
                            <LogOut className="size-4" />
                            Sair
                        </Button>
                        <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => void handleSignOut()}
                            className="sm:hidden"
                            aria-label="Sair"
                        >
                            <LogOut className="size-4" />
                        </Button>
                    </div>
                </div>

                {/* Stats */}
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

                <div className="grid gap-4 lg:grid-cols-5 lg:gap-6">
                    {/* Left column: link + quick actions */}
                    <div className="flex flex-col gap-4 lg:col-span-2 lg:gap-6">
                        {user.slug && <CreatorLinkCard slug={user.slug} />}

                        {showDefaultTabPicker && (
                            <Card>
                                <CardContent>
                                    <ProfileDefaultTabPicker
                                        userId={user.id}
                                        value={user.profileDefaultTab}
                                        availableTabs={availableTabs}
                                        onSaved={() => void refreshUser()}
                                    />
                                </CardContent>
                            </Card>
                        )}

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                            <QuickActionCard
                                href="/profile/ask-me"
                                icon={MessageCircleQuestion}
                                title="Me pergunte"
                                description={
                                    pendingAskMe > 0
                                        ? `${pendingAskMe} aguardando sua resposta`
                                        : "Receba perguntas pagas da audiência"
                                }
                                actionLabel="Gerenciar"
                                badgeCount={pendingAskMe}
                            />

                            <QuickActionCard
                                href="/profile/links"
                                icon={Link2}
                                title="Meus links"
                                description="Links personalizados na sua página pública"
                                actionLabel="Gerenciar"
                            />
                        </div>

                    </div>

                    {/* Right column: products */}
                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <CardTitle>Seus produtos</CardTitle>
                            <CardDescription>
                                Gerencie aulas e documentos que você vende.
                            </CardDescription>
                            <CardAction>
                                <Button
                                    size="sm"
                                    className="ml-2"
                                    onClick={() => router.push("/products/new")}
                                >
                                    <Plus className="size-4" />
                                </Button>
                            </CardAction>
                        </CardHeader>
                        <CardContent className={cn(
                            products.length === 0 ? "h-full" : ""
                        )}>
                            {productsLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loading />
                                </div>
                            ) : (
                                <ProductTabs
                                    products={products}
                                    profile={{ id: user.id, slug: user.slug ?? "" }}
                                    mode="manage"
                                    emptyLessonsLabel="Você ainda não criou nenhuma aula."
                                    emptyDocumentsLabel="Você ainda não criou nenhum documento."
                                    emptyAllLabel="Você ainda não criou nenhuma aula ou documento."
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </LayoutBackground>
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

interface QuickActionCardProps {
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    actionLabel: string;
    badgeCount?: number;
}

function QuickActionCard({
    href,
    icon: Icon,
    title,
    description,
    actionLabel,
    badgeCount = 0,
}: QuickActionCardProps) {
    return (
        <Link
            href={href}
            className="group flex items-center gap-3 rounded-xl border-2 border-border bg-background p-4 text-left shadow-cartoon-sm transition-all hover:-translate-y-0.5 hover:shadow-cartoon"
        >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-primary shadow-cartoon-sm sm:size-11">
                <Icon className="size-5" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-bold leading-tight">{title}</span>
                <span className="text-muted-foreground text-xs font-medium leading-snug">
                    {description}
                </span>
            </span>
            <span className="relative shrink-0">
                <span className="inline-flex items-center gap-1 rounded-lg border-2 border-border bg-background px-2.5 py-1 text-xs font-bold shadow-cartoon-sm">
                    {actionLabel}
                    <ChevronRight className="size-3.5" />
                </span>
                <CountBadge count={badgeCount} />
            </span>
        </Link>
    );
}

interface CreatorLinkCardProps {
    slug: string;
}

export function CreatorLinkCard({ slug }: CreatorLinkCardProps) {
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
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">Seu link público</CardTitle>
                <CardDescription>
                    Compartilhe com sua audiência para vender produtos e receber perguntas.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                <a
                    href={path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 rounded-xl border-2 border-border bg-primary px-3.5 py-3 font-bold text-primary-foreground shadow-cartoon-sm transition-all hover:-translate-y-0.5 hover:shadow-cartoon sm:px-4 sm:py-3.5"
                >
                    <span className="min-w-0 truncate text-sm sm:text-base">
                        <span className="opacity-70">
                            {origin.replace(/^https?:\/\//, "")}
                        </span>
                        {path}
                    </span>
                    <ExternalLink className="size-4 shrink-0" />
                </a>

                <div className="grid grid-cols-2 gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => void handleCopy()}
                    >
                        {copied ? (
                            <>
                                <Check className="size-4" />
                                Copiado!
                            </>
                        ) : (
                            <>
                                <Copy className="size-4" />
                                Copiar
                            </>
                        )}
                    </Button>
                    <Button type="button" variant="outline" className="w-full" asChild>
                        <Link href="/profile/edit">
                            <Pencil className="size-4" />
                            Perfil
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
