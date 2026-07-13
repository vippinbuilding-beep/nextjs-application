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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@vippin/ui/card";
import { Input } from "@vippin/ui/input";
import { Label } from "@vippin/ui/label";
import { navigateBack } from "@/lib/navigation/navigate-back";
import { resolveConsumerDisplayName } from "@/lib/profile/display-name";
import { userRepository } from "@vippin/supabase/factories/repository-factory";
import { toast } from "@/lib/toast";
import { ScreenLoading } from "@vippin/ui/screen-loading";
import { LayoutBackground } from "@vippin/ui/layout-background";

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
    <LayoutBackground
      element="main"
      background="primary"
      className="flex min-h-svh flex-col items-center justify-center p-4 py-10"
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Editar perfil</CardTitle>
          <CardDescription>
            Atualize como você aparece na plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <AvatarPicker
              userId={user!.id}
              displayName={previewName}
              avatarPath={profileAvatarPath}
              avatarFromGoogle={profileAvatarFromGoogle}
              avatarFallbackLabel="Usuário"
              onChange={handleAvatarChange}
            />

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

            {error && (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            )}

            <div className="flex flex-row gap-2">
              <BackButton fallback="/" className="flex-1" disabled={submitting} />
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </LayoutBackground>
  );
}
