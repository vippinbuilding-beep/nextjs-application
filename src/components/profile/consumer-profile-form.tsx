"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ONBOARDING_LIMITS, validateConsumerName } from "@/components/onboarding/validation";
import {
  AvatarPicker,
  persistAvatarSelection,
  type AvatarSelection,
} from "@/components/profile/avatar-picker";
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
import { resolveConsumerDisplayName } from "@/lib/profile/display-name";
import { userRepository } from "@/services/repository-factory";
import { ScreenLoading } from "../ui/screen-loading";
import { LayoutBackground } from "../ui/layout-background";

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
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar dados");
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
              />
            </div>

            {error && (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            )}

            <div className="flex gap-2 flex-row">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.push("/")}
                disabled={submitting}
              >
                <ArrowLeft className="size-4" />
                Voltar
              </Button>
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
