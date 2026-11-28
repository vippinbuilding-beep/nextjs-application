"use client";

import { ChevronRight, Compass, Library, LogOut, MessageCircleQuestion, Pencil, ShoppingBag, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getConsumerDisplayName } from "@/components/profile/consumer-nav-profile";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@vippin/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { Card } from "@vippin/ui/card";
import { LayoutBackground } from "@vippin/ui/layout-background";
import { PageHeader, PageShell } from "@vippin/ui/page-shell";
import { ScreenLoading } from "@vippin/ui/screen-loading";
import { requestBecomeCreator } from "@/lib/profile/become-creator";
import { toast } from "@/lib/toast";
import { isConsumer } from "@/lib/user-role";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { PublicNavBar } from "@/components/navigation/public-nav-bar";
import { ContactEmailLink } from "@/components/ui/contact-email-link";
import { clearOnboardingDraft } from "@/components/onboarding/types";

const MENU_OPTIONS = [
  {
    href: "/my-products",
    icon: Library,
    title: "Ver meus produtos",
    description: "Acesse o que você comprou ou recebeu.",
  },
  {
    href: "/my-orders",
    icon: ShoppingBag,
    title: "Meus pedidos",
    description: "Produtos físicos comprados, com rastreio.",
  },
  {
    href: "/my-questions",
    icon: MessageCircleQuestion,
    title: "Minhas perguntas",
    description: "Perguntas pagas enviadas a criadores.",
  },
  {
    href: "/explore",
    icon: Compass,
    title: "Explorar produtos",
    description: "Descubra aulas e materiais dos criadores.",
  },
  {
    href: "/profile/edit",
    icon: Pencil,
    title: "Editar perfil",
    description: "Atualize seu nome e foto de perfil.",
  }
] as const;

export default function ConsumerHomePage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [becomingCreator, setBecomingCreator] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (!user.onboardingCompleted) {
      router.replace("/onboarding");
      return;
    }
    if (!isConsumer(user)) {
      router.replace("/");
    }
  }, [loading, user, router]);

  if (loading || !user || becomingCreator) {
    return (
      <ScreenLoading
        title="Preparando seu perfil de criador"
        description="Só um instante enquanto configuramos tudo."
      />
    );
  }

  const displayName = getConsumerDisplayName(user);

  async function handleSignOut() {
    await signOut();
    router.replace("/");
  }

  async function handleBecomeCreator() {
    if (becomingCreator || !user) return;

    setBecomingCreator(true);
    try {
      clearOnboardingDraft(user.id);
      await requestBecomeCreator();
      router.replace("/onboarding");
    } catch (error) {
      setBecomingCreator(false);
      const message =
        error instanceof Error ? error.message : "Não foi possível virar criador.";
      toast.error(message);
    }
  }

  return (
    <LayoutBackground
      element="main"
      className="flex min-h-svh flex-col"
    >
      <PublicNavBar backFallback="/" sticky={false} />
      <PageShell width="narrow">
        <PageHeader
          leading={
            <UserAvatar
              userId={user.id}
              name={displayName}
              avatarPath={user.avatarPath}
              avatarUrl={user.avatarUrl}
              size="lg"
            />
          }
          title={`Olá, ${displayName}`}
          description="O que você quer fazer hoje?"
          actions={
            <Button size="sm" variant="ghost" onClick={handleSignOut}>
              <LogOut className="size-4" />
              Sair
            </Button>
          }
        />

        <InstallAppButton />

        <ul className="flex flex-col gap-1">
          {MENU_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <li key={option.href}>
                <Link
                  href={option.href}
                  className="group -mx-3 flex items-center gap-4 rounded-2xl px-3 py-4 text-left transition-colors hover:bg-accent"
                >
                  <span className="bg-muted flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 ease-spring group-hover:scale-105">
                    <Icon className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="font-semibold">{option.title}</span>
                    <span className="text-muted-foreground text-sm">{option.description}</span>
                  </span>
                  <ChevronRight className="text-muted-foreground size-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            );
          })}
        </ul>

        <Card className="gap-4 px-6 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-semibold">Quer vender seu conteúdo?</h2>
            <p className="text-muted-foreground">
              Configure seu perfil de criador, publique produtos e receba via Pix.
              Seus produtos comprados continuam na biblioteca.
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            className="w-full sm:w-fit"
            disabled={becomingCreator}
            onClick={() => void handleBecomeCreator()}
          >
            <Sparkles className="size-5" />
            {becomingCreator ? "Preparando..." : "Quero ser um criador"}
          </Button>
        </Card>

        <ContactEmailLink />
      </PageShell>
    </LayoutBackground>
  );
}
