"use client";

import { ChevronRight, Compass, Library, LogOut, MessageCircleQuestion, Pencil, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getConsumerDisplayName } from "@/components/profile/consumer-nav-profile";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@vippin/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@vippin/ui/card";
import { LayoutBackground } from "@vippin/ui/layout-background";
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
      <div className="flex flex-1 flex-col items-center justify-center p-4 py-6 sm:py-10">
        <Card className="relative w-full max-w-md">
          <div className="absolute top-4 right-4  items-center gap-2 flex">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSignOut}
            >
              <LogOut className="size-4" />

            </Button>
          </div>
          <CardHeader className="items-center text-center">
            <UserAvatar
              userId={user.id}
              name={displayName}
              avatarPath={user.avatarPath}
              avatarUrl={user.avatarUrl}
              size="lg"
              className="mb-2 mx-auto"
            />
            <CardTitle className="text-2xl">Olá, {displayName}</CardTitle>
            <CardDescription>O que você quer fazer hoje?</CardDescription>
            <InstallAppButton className="mt-2" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {MENU_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <Link
                  key={option.href}
                  href={option.href}
                  className="group flex items-center gap-3 rounded-xl border-2 border-border bg-background px-4 py-4 text-left shadow-cartoon-sm transition-all hover:-translate-y-0.5 hover:shadow-cartoon"
                >
                  <span className="flex size-10 md:size-11 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-primary shadow-cartoon-sm">
                    <Icon className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="font-bold">{option.title}</span>
                    <span className="text-muted-foreground text-xs font-medium">
                      {option.description}
                    </span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </Link>
              );
            })}

            <div className="mt-1 rounded-xl border-2 border-border bg-primary/20 p-4 shadow-cartoon-sm">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-primary shadow-cartoon-sm">
                  <Sparkles className="size-5" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold">Quer vender seu conteúdo?</span>
                    <span className="text-muted-foreground text-xs font-medium">
                      Configure seu perfil de criador, publique produtos e receba
                      via PIX. Seus produtos comprados continuam na biblioteca.
                    </span>
                  </div>
                  <Button
                    type="button"
                    className="w-full"
                    disabled={becomingCreator}
                    onClick={() => void handleBecomeCreator()}
                  >
                    {becomingCreator ? "Preparando..." : "Quero ser um criador"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <ContactEmailLink className="mt-4" />
      </div>
    </LayoutBackground>
  );
}
