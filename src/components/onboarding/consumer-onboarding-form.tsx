"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { OnboardingStep } from "@/components/onboarding/onboarding-step";
import {
  ONBOARDING_LIMITS,
  stripAtSign,
  validateConsumerName,
} from "@/components/onboarding/validation";
import {
  AvatarPicker,
  persistAvatarSelection,
  type AvatarSelection,
} from "@/components/profile/avatar-picker";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveConsumerDisplayName } from "@/lib/profile/display-name";
import { userRepository } from "@/services/repository-factory";
import { toast } from "@/lib/toast";

export function ConsumerOnboardingForm() {
  const router = useRouter();
  const { user, refreshUser, signOut } = useAuth();

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

      await refreshUser();
      if (!cancelled) setHydrated(true);
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [user?.id, refreshUser]);

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
        onboardingCompleted: true,
      });
      await persistAvatarSelection(user.id, avatarSelection);
      await refreshUser();
      toast.saved();
      router.push("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao salvar dados";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  if (!hydrated) {
    return null;
  }

  const previewName =
    consumerName.trim() ||
    (user ? resolveConsumerDisplayName(user) : "Usuário");

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <OnboardingStep
        step={1}
        totalSteps={1}
        title="Bem-vindo ao Vippin"
        description="Como você quer aparecer nos comentários e na sua biblioteca?"
      >
        <AvatarPicker
          userId={user!.id}
          displayName={previewName}
          avatarPath={profileAvatarPath}
          avatarFromGoogle={profileAvatarFromGoogle}
          avatarFallbackLabel="Usuário"
          onChange={handleAvatarChange}
        />

        <div className="flex flex-col gap-2">
          <Label htmlFor="consumer-name">Como quer ser chamado?</Label>
          <Input
            id="consumer-name"
            value={consumerName}
            onChange={(event) => setConsumerName(stripAtSign(event.target.value))}
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

        <div className="mt-2 flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleSignOut}
            disabled={submitting}
          >
            Voltar
          </Button>
          <Button type="submit" className="flex-1" disabled={submitting}>
            {submitting ? "Salvando..." : "Começar a explorar"}
          </Button>
        </div>
      </OnboardingStep>
    </form>
  );
}
