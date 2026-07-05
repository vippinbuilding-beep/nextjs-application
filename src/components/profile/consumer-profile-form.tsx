"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ONBOARDING_LIMITS, formatPixKey, inferPixKeyType } from "@/components/onboarding/validation";
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

export function ConsumerProfileForm() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState("");
  const [pixKey, setPixKey] = useState("");
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
        setPixKey(formatPixKey(profile.pixKey ?? ""));
        setProfileAvatarPath(profile.avatarPath ?? null);
        setProfileAvatarUrl(profile.avatarUrl ?? null);
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

    const validationError = validateName(name);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      await userRepository.update(user.id, {
        name: name.trim(),
        pixKey: formatPixKey(pixKey),
        pixKeyType: inferPixKeyType(formatPixKey(pixKey)) || undefined,
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
    return null;
  }

  return (
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
            displayName={name}
            avatarPath={profileAvatarPath}
            avatarUrl={profileAvatarUrl}
            onChange={handleAvatarChange}
          />

          <div className="flex flex-col gap-2">
            <Label htmlFor="consumer-profile-name">Seu nome</Label>
            <Input
              id="consumer-profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Como quer ser chamado"
              autoComplete="name"
              maxLength={ONBOARDING_LIMITS.name.max}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="consumer-profile-pix">Chave PIX (para estornos)</Label>
            <Input
              id="consumer-profile-pix"
              value={pixKey}
              onChange={(event) => setPixKey(formatPixKey(event.target.value))}
              placeholder="CPF, e-mail, telefone ou chave aleatória"
              autoComplete="off"
              maxLength={ONBOARDING_LIMITS.pixKey.max}
            />
            <p className="text-muted-foreground text-xs">
              Necessária para usar Me pergunte e receber estornos se o criador não
              responder.
            </p>
          </div>

          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
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
  );
}
