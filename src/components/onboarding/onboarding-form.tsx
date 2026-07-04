"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import type { User, UserSocials } from "@/core/models/user";
import { userRepository } from "@/services/repository-factory";

import { LinkStepFields } from "./link-step-fields";
import { OnboardingStep } from "./onboarding-step";
import { ProfileStepFields } from "./profile-step-fields";
import { SocialsStepFields } from "./socials-step-fields";
import { INITIAL_ONBOARDING_FORM, type OnboardingFormData } from "./types";
import {
  formatPixKey,
  inferPixKeyType,
  normalizeOnboardingForm,
  validateProfileStep,
  validateSocialsStep,
} from "./validation";

const TOTAL_STEPS = 3;

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

export function OnboardingForm() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<OnboardingFormData>(INITIAL_ONBOARDING_FORM);
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm(formFromUser(user));
    if (user.slug) setSlug(user.slug);
  }, [user]);

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
          onboardingCompleted: false,
        });
        setStep(2);
        return;
      }

      if (step === 2) {
        // Gera o slug único a partir do nome de criador e o persiste, mas ainda
        // não conclui o onboarding: a etapa 3 apenas mostra o link resultante.
        const uniqueSlug = await userRepository.generateUniqueSlug(
          normalizedForm.creatorName
        );
        await userRepository.upsert(user.id, {
          socials: normalizedForm.socials,
          slug: uniqueSlug,
          onboardingCompleted: false,
        });
        setSlug(uniqueSlug);
        setStep(3);
        return;
      }

      await userRepository.upsert(user.id, {
        onboardingCompleted: true,
      });
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
              : "Erro ao concluir cadastro"
      );
    } finally {
      setSubmitting(false);
    }
  }

  const nextSteps = () => {
    router.push("/");
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <div key={step} className="animate-in fade-in slide-in-from-right-2 duration-200">
        {step === 1 ? (
          <OnboardingStep
            step={1}
            totalSteps={TOTAL_STEPS}
            title="Conte um pouco sobre você"
            description="Preencha seus dados para configurar seu perfil de criador"
          >
            <ProfileStepFields data={form} onChange={updateField} />

            {error && (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="mt-2 w-full" disabled={submitting}>
              {submitting ? "Salvando..." : "Continuar"}
            </Button>
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
                onClick={() => {
                  setError(null);
                  setStep(1);
                }}
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
            step={3}
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

            <Button className="mt-2 w-full" onClick={nextSteps}>
              Próximo Passo
            </Button>
          </OnboardingStep>
        )}
      </div>
    </form>
  );
}
