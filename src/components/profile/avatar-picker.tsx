"use client";

import { Camera } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ImageUploadField } from "@/components/ui/file-upload-field";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
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
  | { kind: "google" }
  | { kind: "upload"; file: File }
  | { kind: "existing"; avatarPath?: string; avatarFromGoogle?: boolean }
  | { kind: "none" };

interface AvatarPickerProps {
  userId: string;
  displayName: string;
  avatarPath?: string | null;
  avatarFromGoogle?: boolean;
  avatarFallbackLabel?: string;
  onChange: (selection: AvatarSelection) => void;
}

const GOOGLE_PREVIEW_URL = getProfileAvatarPreviewUrl();

export function AvatarPicker({
  userId,
  displayName,
  avatarPath,
  avatarFromGoogle = false,
  avatarFallbackLabel = "Criador",
  onChange,
}: AvatarPickerProps) {
  const onChangeRef = useRef(onChange);
  const initializedRef = useRef(false);
  const userModifiedRef = useRef(false);
  const [googleAvatarUrl, setGoogleAvatarUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selection, setSelection] = useState<AvatarSelection>({ kind: "none" });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [storedFromGoogle, setStoredFromGoogle] = useState(avatarFromGoogle);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    setStoredFromGoogle(avatarFromGoogle);
  }, [avatarFromGoogle]);

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

      if (avatarPath) {
        setPreviewUrl(getProfileAvatarUrl(userId, avatarPath));
        const next: AvatarSelection = {
          kind: "existing",
          avatarPath,
          avatarFromGoogle,
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
        const next: AvatarSelection = { kind: "google" };
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
  }, [userId, avatarPath, avatarFromGoogle]);

  useEffect(() => {
    if (selection.kind !== "upload") return;
    const url = URL.createObjectURL(selection.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selection]);

  function handleUploadFile(file: File | null) {
    setUploadFile(file);

    if (!file) {
      if (avatarPath) {
        const next: AvatarSelection = {
          kind: "existing",
          avatarPath,
          avatarFromGoogle: storedFromGoogle,
        };
        setSelection(next);
        setPreviewUrl(getProfileAvatarUrl(userId, avatarPath));
        onChangeRef.current(next);
      } else if (googleAvatarUrl) {
        setPreviewUrl(GOOGLE_PREVIEW_URL);
        const next: AvatarSelection = { kind: "google" };
        setSelection(next);
        onChangeRef.current(next);
      } else {
        setPreviewUrl(null);
        const next: AvatarSelection = { kind: "none" };
        setSelection(next);
        onChangeRef.current(next);
      }
      return;
    }

    userModifiedRef.current = true;
    const next: AvatarSelection = { kind: "upload", file };
    setSelection(next);
    onChangeRef.current(next);
  }

  function handleUseGoogle() {
    if (!googleAvatarUrl) return;
    userModifiedRef.current = true;
    setError(null);
    setUploadFile(null);
    setPreviewUrl(GOOGLE_PREVIEW_URL);
    const next: AvatarSelection = { kind: "google" };
    setSelection(next);
    onChangeRef.current(next);
  }

  const previewName = displayName || avatarFallbackLabel;
  const usingGoogleAvatar =
    selection.kind === "google" ||
    (selection.kind === "existing" && storedFromGoogle);
  const showGoogleButton = Boolean(googleAvatarUrl) && !usingGoogleAvatar;
  const hasExistingPhoto =
    selection.kind === "existing" ||
    selection.kind === "google" ||
    Boolean(previewUrl);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="avatar">Sua foto de perfil</Label>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <UserAvatar
          userId={userId}
          name={previewName}
          avatarPath={avatarPath}
          src={previewUrl && selection.kind !== "none" ? previewUrl : null}
          size="xl"
          className="shrink-0"
        />

        <div className="min-w-0 flex-1">
          <ImageUploadField
            id="avatar"
            accept={AVATAR_ACCEPT}
            file={uploadFile}
            onFileChange={handleUploadFile}
            validate={validateAvatarFile}
            onValidationError={setError}
            title="Escolher foto de perfil"
            description="Clique ou arraste uma imagem aqui"
            existingFileName={
              hasExistingPhoto && !uploadFile ? "Foto de perfil atual" : null
            }
            icon={Camera}
            hint={`PNG, JPG, WEBP ou GIF. Máx. ${formatFileSize(AVATAR_MAX_SIZE)}.`}
          />

          {showGoogleButton && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 w-full sm:w-auto"
              onClick={handleUseGoogle}
            >
              Usar foto do Google
            </Button>
          )}
          {usingGoogleAvatar && (
            <p className="text-muted-foreground mt-2 text-xs">
              Usando a foto da sua conta Google. Envie outra imagem para trocar.
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      )}
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
