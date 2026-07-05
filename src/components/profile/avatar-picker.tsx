"use client";

import { useEffect, useRef, useState } from "react";

import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AVATAR_ACCEPT,
  AVATAR_MAX_SIZE,
  extractGoogleAvatarUrl,
  validateAvatarFile,
} from "@/lib/profile";
import { formatFileSize } from "@/lib/products";
import { supabase } from "@/lib/supabase/client";
import { getProfileAvatarPreviewUrl, getProfileAvatarUrl } from "@/lib/supabase/storage";

export type AvatarSelection =
  | { kind: "google"; url: string }
  | { kind: "upload"; file: File }
  | { kind: "existing"; avatarPath?: string; avatarUrl?: string }
  | { kind: "none" };

interface AvatarPickerProps {
  userId: string;
  displayName: string;
  avatarPath?: string | null;
  avatarUrl?: string | null;
  onChange: (selection: AvatarSelection) => void;
}

const GOOGLE_PREVIEW_URL = getProfileAvatarPreviewUrl();

export function AvatarPicker({
  userId,
  displayName,
  avatarPath,
  avatarUrl,
  onChange,
}: AvatarPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const initializedRef = useRef(false);
  const userModifiedRef = useRef(false);
  const [googleAvatarUrl, setGoogleAvatarUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selection, setSelection] = useState<AvatarSelection>({ kind: "none" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (userModifiedRef.current) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;

      const googleUrl = extractGoogleAvatarUrl(user.user_metadata);
      setGoogleAvatarUrl(googleUrl);

      if (avatarPath || avatarUrl) {
        setPreviewUrl(getProfileAvatarUrl(userId, avatarPath ?? avatarUrl));
        const next: AvatarSelection = {
          kind: "existing",
          avatarPath: avatarPath ?? undefined,
          avatarUrl: avatarUrl ?? undefined,
        };
        setSelection(next);
        if (!initializedRef.current) {
          initializedRef.current = true;
          onChangeRef.current(next);
        }
        return;
      }

      if (googleUrl) {
        setPreviewUrl(GOOGLE_PREVIEW_URL);
        const next: AvatarSelection = { kind: "google", url: googleUrl };
        setSelection(next);
        if (!initializedRef.current) {
          initializedRef.current = true;
          onChangeRef.current(next);
        }
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [userId, avatarPath, avatarUrl]);

  useEffect(() => {
    if (selection.kind !== "upload") return;
    const url = URL.createObjectURL(selection.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selection]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    if (inputRef.current) inputRef.current.value = "";

    if (!selected) return;

    const validationError = validateAvatarFile(selected);
    if (validationError) {
      setError(validationError);
      return;
    }

    userModifiedRef.current = true;
    setError(null);
    const next: AvatarSelection = { kind: "upload", file: selected };
    setSelection(next);
    onChangeRef.current(next);
  }

  function handleUseGoogle() {
    if (!googleAvatarUrl) return;
    if (inputRef.current) inputRef.current.value = "";
    userModifiedRef.current = true;
    setError(null);
    setPreviewUrl(GOOGLE_PREVIEW_URL);
    const next: AvatarSelection = { kind: "google", url: googleAvatarUrl };
    setSelection(next);
    onChangeRef.current(next);
  }

  const previewName = displayName || "Criador";
  const showGoogleButton =
    Boolean(googleAvatarUrl) && selection.kind !== "google";

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="avatar">Sua foto de perfil</Label>
      <div className="flex flex-wrap items-center gap-4">
        <UserAvatar
          userId={userId}
          name={previewName}
          avatarPath={avatarPath}
          avatarUrl={avatarUrl}
          src={previewUrl && selection.kind !== "none" ? previewUrl : null}
          size="xl"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Input
            id="avatar"
            ref={inputRef}
            type="file"
            accept={AVATAR_ACCEPT}
            onChange={handleFileChange}
          />
          {showGoogleButton && (
            <Button type="button" variant="outline" size="sm" onClick={handleUseGoogle}>
              Usar foto do Google
            </Button>
          )}
          {selection.kind === "google" && (
            <p className="text-muted-foreground text-xs">
              Usando a foto da sua conta Google. Envie outra imagem para trocar.
            </p>
          )}
          {selection.kind === "upload" && (
            <p className="text-muted-foreground text-xs">
              Nova foto selecionada. Salve para aplicar.
            </p>
          )}
        </div>
      </div>
      {error && (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      )}
      <p className="text-muted-foreground text-xs">
        PNG, JPG, WEBP ou GIF. Máx. {formatFileSize(AVATAR_MAX_SIZE)}.
      </p>
    </div>
  );
}

export async function persistAvatarSelection(
  userId: string,
  selection: AvatarSelection
): Promise<void> {
  const { userRepository } = await import("@/services/repository-factory");

  if (selection.kind === "upload") {
    const uploaded = await userRepository.uploadAvatar(userId, selection.file);
    await userRepository.update(userId, {
      avatarPath: uploaded.avatarPath,
      avatarMime: uploaded.avatarMime,
      avatarUrl: null,
    });
    return;
  }

  if (selection.kind === "google") {
    const response = await fetch("/api/profile/avatar/import-google", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ force: true }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      throw new Error(
        body?.error ?? "Não foi possível salvar a foto do Google."
      );
    }
  }
}
