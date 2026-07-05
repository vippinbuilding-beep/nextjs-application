"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { OnboardingStep } from "@/components/onboarding/onboarding-step";
import { ONBOARDING_LIMITS } from "@/components/onboarding/validation";
import {
  AvatarPicker,
  persistAvatarSelection,
  type AvatarSelection,
} from "@/components/profile/avatar-picker";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { userRepository } from "@/services/repository-factory";

function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < ONBOARDING_LIMITS.name.min) {
    return `O nome precisa ter pelo menos ${ONBOARDING_LIMITS.name.min} caracteres`;
  }
  if (trimmed.length > ONBOARDING_LIMITS.name.max) {
    return `O nome pode ter no máximo ${ONBOARDING_LIMITS.name.max} caracteres`;
  }
  return null;
}

export function ConsumerOnboardingForm() {
  const router = useRouter();
  const { user, refreshUser, signOut } = useAuth();

  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [avatarSelection, setAvatarSelection] = useState<AvatarSelection>({
    kind: "none",
  });
  const [profileAvatarPath, setProfileAvatarPath] = useState<string | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);

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
        setName(profile.name ?? profile.displayName ?? "");
        setProfileAvatarPath(profile.avatarPath ?? null);
        setProfileAvatarUrl(profile.avatarUrl ?? null);
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

    const validationError = validateName(name);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      await userRepository.upsert(user.id, {
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt,
        name: name.trim(),
        role: "consumer",
        onboardingCompleted: true,
      });
      await persistAvatarSelection(user.id, avatarSelection);
      await refreshUser();
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar dados");
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
          displayName={name}
          avatarPath={profileAvatarPath}
          avatarUrl={profileAvatarUrl}
          onChange={handleAvatarChange}
        />

        <div className="flex flex-col gap-2">
          <Label htmlFor="consumer-name">Seu nome</Label>
          <Input
            id="consumer-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Como quer ser chamado"
            autoComplete="name"
            maxLength={ONBOARDING_LIMITS.name.max}
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
