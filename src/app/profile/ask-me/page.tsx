"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AskMeCreatorInbox } from "@/components/ask-me/ask-me-creator-inbox";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LayoutBackground } from "@/components/ui/layout-background";
import { ScreenLoading } from "@/components/ui/screen-loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ASK_ME_LIMITS,
  resolveAskMePriceCents,
  validateAskMePriceInput,
} from "@/lib/ask-me";
import { centsToReaisInput, formatBRL, parseReaisToCents } from "@/lib/money";
import { isCreator } from "@/lib/user-role";
import { userRepository } from "@/services/repository-factory";
import { toast, TOAST_MESSAGES } from "@/lib/toast";

export default function AskMeProfilePage() {
  const router = useRouter();
  const { user, loading, refreshUser } = useAuth();

  const [enabled, setEnabled] = useState(false);
  const [priceInput, setPriceInput] = useState(
    centsToReaisInput(ASK_ME_LIMITS.defaultPriceCents)
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!user.onboardingCompleted) {
      router.replace("/onboarding");
      return;
    }
    if (!isCreator(user)) {
      router.replace("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user?.id) return;
    setEnabled(user.askMeEnabled ?? false);
    const cents = resolveAskMePriceCents(
      user.askMeEnabled ?? false,
      user.askMePriceCents
    );
    setPriceInput(centsToReaisInput(cents));
    setHydrated(true);
  }, [user?.id, user?.askMeEnabled, user?.askMePriceCents]);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setError(null);
    const priceCents = enabled ? parseReaisToCents(priceInput) : null;
    if (enabled && priceCents != null) {
      const priceError = validateAskMePriceInput(priceCents);
      if (priceError) {
        setError(priceError);
        return;
      }
    }

    setSubmitting(true);
    try {
      await userRepository.update(user.id, {
        askMeEnabled: enabled,
        askMePriceCents: enabled ? priceCents : null,
      });
      await refreshUser();
      toast.success(TOAST_MESSAGES.settingsSaved);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao salvar configurações";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user || !hydrated) {
    return <ScreenLoading />;
  }

  const effectivePrice = resolveAskMePriceCents(enabled, parseReaisToCents(priceInput));

  return (
    <LayoutBackground
      element="main"
      background="primary"
      className="flex min-h-svh flex-col items-center justify-center p-4 py-10"
    >
      <Card className="relative w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Me pergunte</CardTitle>
          <CardDescription>
            Permita que sua audiência envie perguntas pagas. O valor fica retido
            até você responder em até {ASK_ME_LIMITS.responseDeadlineHours}h — ou
            é estornado automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="settings">
            <TabsList className="mb-4 max-w-none sm:max-w-md">
              <TabsTrigger value="settings">Configurações</TabsTrigger>
              <TabsTrigger value="inbox">Perguntas recebidas</TabsTrigger>
            </TabsList>

            <TabsContent value="settings">
              <form onSubmit={handleSaveSettings} className="flex flex-col gap-4">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-border bg-background p-4 shadow-cartoon-sm">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="size-4 accent-primary"
                    disabled={submitting}
                  />
                  <span className="flex flex-col gap-0.5 text-left">
                    <span className="font-bold">Ativar Me pergunte</span>
                    <span className="text-muted-foreground text-xs">
                      Exibe o botão no seu perfil público
                    </span>
                  </span>
                </label>

                {enabled && (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="ask-me-price">Valor por pergunta (R$)</Label>
                    <Input
                      id="ask-me-price"
                      inputMode="decimal"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      placeholder="2,00"
                      disabled={submitting}
                    />
                    <p className="text-muted-foreground text-xs">
                      Mínimo {formatBRL(ASK_ME_LIMITS.minPriceCents)}. Padrão{" "}
                      {formatBRL(ASK_ME_LIMITS.defaultPriceCents)}. Você recebe 90%
                      ao responder; a plataforma fica com 10%.
                    </p>
                    <p className="text-xs font-medium">
                      Valor exibido no perfil: {formatBRL(effectivePrice)}
                    </p>
                  </div>
                )}

                {error && (
                  <p className="text-destructive text-sm" role="alert">
                    {error}
                  </p>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.back()}
                    disabled={submitting}
                  >
                    Voltar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={submitting}>
                    {submitting ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="inbox">
              <AskMeCreatorInbox creatorId={user.id} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </LayoutBackground>
  );
}
