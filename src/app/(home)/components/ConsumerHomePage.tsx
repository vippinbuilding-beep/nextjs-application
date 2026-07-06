"use client";

import { ChevronRight, Compass, Library, LogOut, MessageCircleQuestion, Pencil } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { NotificationBell } from "@/components/notifications/notification-bell";
import { getConsumerDisplayName } from "@/components/profile/consumer-nav-profile";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LayoutBackground } from "@/components/ui/layout-background";
import { ScreenLoading } from "@/components/ui/screen-loading";
import { isConsumer } from "@/lib/user-role";

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

  if (loading || !user) {
    return <ScreenLoading />;
  }

  const displayName = getConsumerDisplayName(user);

  async function handleSignOut() {
    await signOut();
    router.replace("/");
  }

  return (
    <LayoutBackground
      element="main"
      className="flex min-h-svh flex-col items-center justify-center p-4 py-10"
    >
      <Card className="relative w-full max-w-md">
        <div className="absolute top-4 right-4  items-center gap-2 flex">
          <NotificationBell />
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
        </CardContent>
      </Card>
    </LayoutBackground>
  );
}
