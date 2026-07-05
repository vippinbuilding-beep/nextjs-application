"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  AvatarPicker,
  persistAvatarSelection,
  type AvatarSelection,
} from "@/components/profile/avatar-picker";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import type { User, UserSocials } from "@/core/models/user";
import { userRepository } from "@/services/repository-factory";

import { LinkStepFields } from "./link-step-fields";
import { OnboardingStep } from "./onboarding-step";
import { ProfileStepFields } from "./profile-step-fields";
import { SocialsStepFields } from "./socials-step-fields";
import { ProfileLinksEditor } from "@/components/profile/profile-links-editor";
import {
  clearOnboardingDraft,
  INITIAL_ONBOARDING_FORM,
  readOnboardingDraft,
  writeOnboardingDraft,
  type OnboardingFormData,
} from "./types";
import {
  formatPixKey,
  inferPixKeyType,
  normalizeOnboardingForm,
  validateProfileStep,
  validateSocialsStep,
} from "./validation";

const TOTAL_STEPS = 4;

function formFromUser(user: User): OnboardingFormData {
  const pixKey = formatPixKey(user.pixKey ?? "");

  return {
    name: user.name ?? "",
    birthDate: user.birthDate ?? "",
    pixKey,
    pixKeyType: user.pixKeyType ?? inferPixKeyType(pixKey),
    creatorName: user.creatorName ?? "",
    socials: user.socials ?? {},
  };
}

function inferStepFromUser(user: User): number {
  if (user.slug) return 3;
  if (user.creatorName) return 2;
  return 1;
}

export function OnboardingForm() {
  const router = useRouter();
  const { user, refreshUser, signOut } = useAuth();
  const userId = user?.id;

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<OnboardingFormData>(INITIAL_ONBOARDING_FORM);
  const [slug, setSlug] = useState("");
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
    if (!userId) return;

    const id = userId;
    let cancelled = false;

    async function hydrate() {
      const profile = await userRepository.getById(id);
      if (cancelled) return;

      const draft = readOnboardingDraft(id);
      if (draft) {
        setForm(draft.form);
        setStep(draft.step);
        setSlug(draft.slug);
      } else if (profile) {
        setForm(formFromUser(profile));
        setStep(inferStepFromUser(profile));
        setSlug(profile.slug ?? "");
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
  }, [userId, refreshUser]);

  useEffect(() => {
    if (!user || !hydrated) return;
    writeOnboardingDraft(user.id, { step, form, slug });
  }, [user, hydrated, step, form, slug]);

  function updateField(field: keyof Omit<OnboardingFormData, "socials">, value: string) {
    setForm((prev) => {
      if (field !== "pixKey") {
        return { ...prev, [field]: value };
      }

      const formattedPixKey = formatPixKey(value);
      return {
        ...prev,
        pixKey: formattedPixKey,
        pixKeyType: inferPixKeyType(formattedPixKey),
      };
    });
  }

  function updateSocial(key: keyof UserSocials, value: string) {
    setForm((prev) => ({
      ...prev,
      socials: { ...prev.socials, [key]: value },
    }));
  }

  async function advanceFromLinksStep() {
    if (!user) return;

    setError(null);
    setSubmitting(true);

    try {
      setStep(4);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao continuar"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setError(null);

    const normalizedForm = normalizeOnboardingForm(form);
    const validationError =
      step === 1
        ? validateProfileStep(normalizedForm)
        : step === 2
          ? validateSocialsStep(normalizedForm.socials)
          : null;

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      if (step === 1) {
        await userRepository.upsert(user.id, {
          email: user.email,
          displayName: user.displayName,
          createdAt: user.createdAt,
          name: normalizedForm.name,
          birthDate: normalizedForm.birthDate,
          pixKey: normalizedForm.pixKey,
          pixKeyType: normalizedForm.pixKeyType || undefined,
          creatorName: normalizedForm.creatorName,
          role: "creator",
          onboardingCompleted: false,
        });
        await persistAvatarSelection(user.id, avatarSelection);
        await refreshUser();
        setStep(2);
        return;
      }

      if (step === 2) {
        const uniqueSlug = await userRepository.generateUniqueSlug(
          normalizedForm.creatorName
        );
        await userRepository.upsert(user.id, {
          socials: normalizedForm.socials,
          slug: uniqueSlug,
          onboardingCompleted: false,
        });
        await refreshUser();
        setSlug(uniqueSlug);
        setStep(3);
        return;
      }

      await userRepository.upsert(user.id, {
        onboardingCompleted: true,
      });
      clearOnboardingDraft(user.id);
      await refreshUser();
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : step === 1
            ? "Erro ao salvar dados"
            : step === 2
              ? "Erro ao salvar redes sociais"
              : step === 3
                ? "Erro ao continuar"
                : "Erro ao concluir cadastro"
      );
    } finally {
      setSubmitting(false);
    }
  }

  function goToStep(nextStep: number) {
    setError(null);
    setStep(nextStep);
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  if (!hydrated) {
    return null;
  }

  return (
    <div className="w-full max-w-md">
      <div key={step} className="animate-in fade-in slide-in-from-right-2 duration-200">
        {step === 3 ? (
          <OnboardingStep
            step={3}
            totalSteps={TOTAL_STEPS}
            title="Seus links"
            description="Adicione links personalizados com título e imagem para sua página pública (opcional)"
          >
            <ProfileLinksEditor creatorId={user!.id} compact />

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
                onClick={() => goToStep(2)}
                disabled={submitting}
              >
                Voltar
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={submitting}
                onClick={() => void advanceFromLinksStep()}
              >
                Continuar
              </Button>
            </div>
          </OnboardingStep>
        ) : (
          <form onSubmit={handleSubmit}>
        {step === 1 ? (
          <OnboardingStep
            step={1}
            totalSteps={TOTAL_STEPS}
            title="Conte um pouco sobre você"
            description="Preencha seus dados para configurar seu perfil de criador"
          >
            <AvatarPicker
              userId={user!.id}
              displayName={form.creatorName || form.name}
              avatarPath={profileAvatarPath}
              avatarUrl={profileAvatarUrl}
              onChange={handleAvatarChange}
            />

            <ProfileStepFields data={form} onChange={updateField} />

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
                {submitting ? "Salvando..." : "Continuar"}
              </Button>
            </div>
          </OnboardingStep>
        ) : step === 2 ? (
          <OnboardingStep
            step={2}
            totalSteps={TOTAL_STEPS}
            title="Suas redes sociais"
            description="Adicione pelo menos uma rede social (pode pular as que não tiver)"
          >
            <SocialsStepFields socials={form.socials} onSocialChange={updateSocial} />

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
                onClick={() => goToStep(1)}
                disabled={submitting}
              >
                Voltar
              </Button>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? "Gerando link..." : "Continuar"}
              </Button>
            </div>
          </OnboardingStep>
        ) : (
          <OnboardingStep
            step={4}
            totalSteps={TOTAL_STEPS}
            title="Tudo pronto!"
            description="Geramos o link exclusivo do seu perfil de criador"
          >
            <LinkStepFields slug={slug} />

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
                onClick={() => goToStep(3)}
                disabled={submitting}
              >
                Voltar
              </Button>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? "Concluindo..." : "Concluir cadastro"}
              </Button>
            </div>
          </OnboardingStep>
        )}
          </form>
        )}
      </div>
    </div>
  );
}
