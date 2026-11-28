"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { BackButton } from "@/components/navigation/back-button";
import { ONBOARDING_LIMITS, validateConsumerName } from "@/components/onboarding/validation";
import {
  AvatarPicker,
  persistAvatarSelection,
  type AvatarSelection,
} from "@/components/profile/avatar-picker";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@vippin/ui/button";
import { Card } from "@vippin/ui/card";
import { Input } from "@vippin/ui/input";
import { Label } from "@vippin/ui/label";
import { navigateBack } from "@/lib/navigation/navigate-back";
import { resolveConsumerDisplayName } from "@/lib/profile/display-name";
import { userRepository } from "@vippin/supabase/factories/repository-factory";
import { toast } from "@/lib/toast";
import { ScreenLoading } from "@vippin/ui/screen-loading";
import { LayoutBackground } from "@vippin/ui/layout-background";
import { FormSection, PageHeader, PageShell } from "@vippin/ui/page-shell";

export function ConsumerProfileForm() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [consumerName, setConsumerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [avatarSelection, setAvatarSelection] = useState<AvatarSelection>({
    kind: "none",
  });
  const [profileAvatarPath, setProfileAvatarPath] = useState<string | null>(null);
  const [profileAvatarFromGoogle, setProfileAvatarFromGoogle] = useState(false);

  const handleAvatarChange = useCallback((selection: AvatarSelection) => {
    setAvatarSelection(selection);
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const id = user.id;
    let cancelled = false;

    async function hydrate() {
      const profile = await userRepository.getById(id);
      if (cancelled) return;

      if (profile) {
        setConsumerName(
          profile.consumerName ??
          profile.displayName ??
          ""
        );
        setProfileAvatarPath(profile.avatarPath ?? null);
        setProfileAvatarFromGoogle(profile.avatarFromGoogle ?? false);
      }

      if (!cancelled) setHydrated(true);
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setError(null);

    const validationError = validateConsumerName(consumerName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      await userRepository.update(user.id, {
        consumerName: consumerName.trim(),
      });
      await persistAvatarSelection(user.id, avatarSelection);
      await refreshUser();
      toast.saved();
      navigateBack(router, "/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao salvar dados";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return <ScreenLoading background="primary" />
  }

  const previewName =
    consumerName.trim() ||
    (user ? resolveConsumerDisplayName(user) : "Usuário");

  return (
    <LayoutBackground element="main" className="flex min-h-svh flex-col">
      <PageShell width="form" className="gap-10 sm:gap-12">
        <PageHeader
          title="Editar perfil"
          description="Atualize como você aparece na plataforma."
          actions={<BackButton fallback="/" disabled={submitting} />}
        />
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <Card className="px-6 py-6 sm:px-10 sm:py-8">
            <FormSection title="Foto" description="Aparece nos seus comentários e perguntas.">
              <AvatarPicker
                userId={user!.id}
                displayName={previewName}
                avatarPath={profileAvatarPath}
                avatarFromGoogle={profileAvatarFromGoogle}
                avatarFallbackLabel="Usuário"
                onChange={handleAvatarChange}
              />
            </FormSection>
            <FormSection title="Nome" description="Como os criadores vão te chamar.">
              <div className="flex flex-col gap-2">
                <Label htmlFor="consumer-profile-name">Como quer ser chamado?</Label>
                <Input
                  id="consumer-profile-name"
                  value={consumerName}
                  onChange={(event) => setConsumerName(event.target.value)}
                  placeholder="Seu nome na plataforma"
                  autoComplete="nickname"
                  maxLength={ONBOARDING_LIMITS.consumerName.max}
                  disabled={submitting}
                />
              </div>
            </FormSection>
          </Card>

          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </PageShell>
    </LayoutBackground>
  );
}
