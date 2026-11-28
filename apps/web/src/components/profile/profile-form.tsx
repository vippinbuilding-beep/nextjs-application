"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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
import { BackButton } from "@/components/navigation/back-button";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@vippin/ui/button";
import { Loading } from "@vippin/ui/loading";
import { Card } from "@vippin/ui/card";
import type { User, UserSocials } from "@vippin/core/models/user";
import { userRepository } from "@vippin/supabase/factories/repository-factory";
import { toast } from "@/lib/toast";
import { navigateBack } from "@/lib/navigation/navigate-back";
import { ScreenLoading } from "@vippin/ui/screen-loading";
import { LayoutBackground } from "@vippin/ui/layout-background";
import { FormSection, PageHeader, PageShell } from "@vippin/ui/page-shell";

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

export function ProfileForm({ embedded = false }: { embedded?: boolean }) {
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
      toast.saved();
      navigateBack(router, "/");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao salvar alterações do perfil";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }


  if (!hydrated) {
    if (embedded) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loading />
        </div>
      );
    }
    return <ScreenLoading background="primary" />;
  }

  const formContent = (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-8">
      <Card className="px-6 py-6 sm:px-10 sm:py-8">
        <FormSection
          title="Seu link"
          description="Se você mudar o nome de criador, o link muda junto."
        >
          <LinkStepFields slug={slug} />
        </FormSection>

        <FormSection title="Foto e dados" description="Como você aparece na vitrine e nos recibos de pagamento.">
          <AvatarPicker
            userId={user!.id}
            displayName={form.creatorName || form.name}
            avatarPath={profileAvatarPath}
            avatarFromGoogle={profileAvatarFromGoogle}
            onChange={handleAvatarChange}
          />
          <ProfileStepFields data={form} onChange={updateField} />
        </FormSection>

        <FormSection title="Redes sociais" description="Aparecem como ícones no topo da sua vitrine.">
          <SocialsStepFields socials={form.socials} onSocialChange={updateSocial} />
        </FormSection>
      </Card>

      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        {!embedded && <BackButton fallback="/" disabled={submitting} />}
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );

  if (embedded) {
    return formContent;
  }

  return (
    <LayoutBackground element="main" className="flex min-h-svh flex-col">
      <PageShell width="form" className="gap-10 sm:gap-12">
        <PageHeader
          title="Editar perfil"
          description="Atualize seus dados, redes sociais e informações de pagamento."
        />
        {formContent}
      </PageShell>
    </LayoutBackground>
  );
}
