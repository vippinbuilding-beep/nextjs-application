"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { LayoutDashboard } from "lucide-react";

import { LinkStepFields } from "@/components/onboarding/link-step-fields";
import { ProfileStepFields } from "@/components/onboarding/profile-step-fields";
import { SocialsStepFields } from "@/components/onboarding/socials-step-fields";
import {
  AvatarPicker,
  persistAvatarSelection,
  type AvatarSelection,
} from "@/components/profile/avatar-picker";
import {
  INITIAL_ONBOARDING_FORM,
  type OnboardingFormData,
} from "@/components/onboarding/types";
import {
  formatPixKey,
  inferPixKeyType,
  normalizeOnboardingForm,
  validateCreatorProfileStep,
  validateSocialsStep,
} from "@/components/onboarding/validation";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { User, UserSocials } from "@/core/models/user";
import { userRepository } from "@/services/repository-factory";
import { ScreenLoading } from "../ui/screen-loading";
import { LayoutBackground } from "../ui/layout-background";

function formFromUser(user: User): OnboardingFormData {
  const pixKey = formatPixKey(user.pixKey ?? "");

  return {
    name: user.name ?? "",
    birthDate: user.birthDate ?? "",
    pixKey,
    pixKeyType: user.pixKeyType ?? inferPixKeyType(pixKey),
    creatorName: user.creatorName ?? "",
    bio: user.bio ?? "",
    socials: user.socials ?? {},
  };
}

export function ProfileForm() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [form, setForm] = useState<OnboardingFormData>(INITIAL_ONBOARDING_FORM);
  const [slug, setSlug] = useState("");
  const [originalCreatorName, setOriginalCreatorName] = useState("");
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
      if (cancelled || !profile) return;

      setForm(formFromUser(profile));
      setSlug(profile.slug ?? "");
      setOriginalCreatorName(profile.creatorName ?? "");
      setProfileAvatarPath(profile.avatarPath ?? null);
      setProfileAvatarFromGoogle(profile.avatarFromGoogle ?? false);
      setHydrated(true);
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

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
    const profileError = validateCreatorProfileStep(normalizedForm);
    const socialsError = validateSocialsStep(normalizedForm.socials);
    const validationError = profileError ?? socialsError;

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      let nextSlug = slug;
      if (normalizedForm.creatorName !== originalCreatorName) {
        nextSlug = await userRepository.generateUniqueSlug(normalizedForm.creatorName);
      }

      await userRepository.update(user.id, {
        name: normalizedForm.name,
        birthDate: normalizedForm.birthDate,
        pixKey: normalizedForm.pixKey,
        pixKeyType: normalizedForm.pixKeyType || undefined,
        creatorName: normalizedForm.creatorName,
        bio: normalizedForm.bio || null,
        socials: normalizedForm.socials,
        slug: nextSlug,
      });

      await persistAvatarSelection(user.id, avatarSelection);

      const updatedProfile = await userRepository.getById(user.id);
      if (updatedProfile) {
        setProfileAvatarPath(updatedProfile.avatarPath ?? null);
        setProfileAvatarFromGoogle(updatedProfile.avatarFromGoogle ?? false);
      }

      await refreshUser();
      router.back();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao salvar alterações do perfil"
      );
    } finally {
      setSubmitting(false);
    }
  }


  if (!hydrated) {
    return <ScreenLoading background="primary" />
  }

  return (
    <LayoutBackground
      element="main"
      background="primary"
      className="flex min-h-svh flex-col items-center justify-center p-4 py-10"
    >
      <form onSubmit={handleSubmit} className="w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Editar perfil</CardTitle>
            <CardDescription>
              Atualize seus dados, redes sociais e informações de pagamento.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <LinkStepFields slug={slug} />
            <p className="text-muted-foreground -mt-2 text-xs">
              Se você alterar o nome de criador, o link será atualizado automaticamente.
            </p>

            <div className="border-t-2 border-dashed border-border" />

            <AvatarPicker
              userId={user!.id}
              displayName={form.creatorName || form.name}
              avatarPath={profileAvatarPath}
              avatarFromGoogle={profileAvatarFromGoogle}
              onChange={handleAvatarChange}
            />

            <ProfileStepFields data={form} onChange={updateField} />

            <div className="border-t-2 border-dashed border-border" />

            <p className="text-sm font-semibold">Redes sociais</p>
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
                onClick={() => router.back()}
                disabled={submitting}
              >
                Voltar
              </Button>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </LayoutBackground>
  );
}
