"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AskMeCreatorInbox } from "@/components/ask-me/ask-me-creator-inbox";
import { CreatorModuleHeader } from "@/components/creator/creator-module-header";
import { CreatorPayoutPreview } from "@/components/creator/creator-payout-preview";
import { useAuth } from "@/components/providers/auth-provider";
import { useLoginRedirect } from "@/hooks/use-login-redirect";
import { useCreatorPendingAskMe } from "@/hooks/use-creator-pending-ask-me";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScreenLoading } from "@/components/ui/screen-loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ASK_ME_LIMITS,
  resolveAskMePriceCents,
  validateAskMePriceInput,
} from "@/lib/ask-me";
import { centsToReaisInput, formatBRL, parseReaisToCents } from "@/lib/money";
import { creatorMePergunteFeeDescription } from "@/lib/payments/platform-fee";
import { isCreator } from "@/lib/user-role";
import { userRepository } from "@/services/repository-factory";
import { toast, TOAST_MESSAGES } from "@/lib/toast";

export default function AskMeProfilePage() {
  const router = useRouter();
  const redirectToLogin = useLoginRedirect();
  const { user, loading, refreshUser } = useAuth();

  const [enabled, setEnabled] = useState(false);
  const [priceInput, setPriceInput] = useState(
    centsToReaisInput(ASK_ME_LIMITS.defaultPriceCents)
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const pendingCount = useCreatorPendingAskMe(user?.id);

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
    }
  }, [loading, user, router, redirectToLogin]);

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
  const defaultTab = pendingCount > 0 ? "unanswered" : "settings";

  return (
    <div className="flex flex-col gap-6">
      <CreatorModuleHeader
        title="Me pergunte"
        description={`Permita que sua audiência envie perguntas pagas. O valor fica retido até você responder em até ${ASK_ME_LIMITS.responseDeadlineHours}h — ou é estornado automaticamente.`}
      />

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue={defaultTab}>
            <TabsList className="mb-4 w-full gap-1 overflow-x-auto p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <TabsTrigger value="settings" className="shrink-0 flex-none px-3 sm:px-4">
                Configurações
              </TabsTrigger>
              <TabsTrigger
                value="unanswered"
                className="relative shrink-0 flex-none px-3 sm:px-4"
              >
                Não respondidas
                {pendingCount > 0 && (
                  <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full border-2 border-border bg-background px-1 text-[10px] font-bold leading-5">
                    {pendingCount > 9 ? "9+" : pendingCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="inbox" className="shrink-0 flex-none px-3 sm:px-4">
                Todas
              </TabsTrigger>
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
                      placeholder="5,00"
                      disabled={submitting}
                    />
                    <p className="text-muted-foreground text-xs">
                      De {formatBRL(ASK_ME_LIMITS.minPriceCents)} a{" "}
                      {formatBRL(ASK_ME_LIMITS.maxPriceCents)}. Padrão{" "}
                      {formatBRL(ASK_ME_LIMITS.defaultPriceCents)}.{" "}
                      {creatorMePergunteFeeDescription()}
                    </p>
                    <p className="text-xs font-medium">
                      Valor exibido no perfil: {formatBRL(effectivePrice)}
                    </p>
                    <CreatorPayoutPreview grossCents={effectivePrice} unitLabel="pergunta" />
                  </div>
                )}

                {error && (
                  <p className="text-destructive text-sm" role="alert">
                    {error}
                  </p>
                )}

                <div className="flex justify-end">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="unanswered" className="flex flex-col gap-4">
              <p className="text-muted-foreground text-sm">
                Perguntas pagas que ainda estão dentro do prazo de{" "}
                {ASK_ME_LIMITS.responseDeadlineHours}h para você responder ou recusar.
              </p>
              <AskMeCreatorInbox creatorId={user.id} filter="unanswered" />
            </TabsContent>

            <TabsContent value="inbox" className="flex flex-col gap-4">
              <AskMeCreatorInbox creatorId={user.id} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
