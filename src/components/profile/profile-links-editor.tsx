"use client";

import {
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Link2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProfileLink } from "@/core/models/profile-link";
import {
  normalizeProfileLinkUrl,
  PROFILE_LINK_IMAGE_ACCEPT,
  PROFILE_LINK_LIMITS,
  validateProfileLinkImage,
  validateProfileLinkTitle,
  validateProfileLinkUrl,
} from "@/lib/profile-links";
import { getProfileLinkImageUrl } from "@/lib/supabase/storage";
import { profileLinkRepository } from "@/services/repository-factory";

interface ProfileLinksEditorProps {
  creatorId: string;
  /** When true, hides reorder controls and uses a simpler layout for onboarding. */
  compact?: boolean;
}

interface LinkDraft {
  title: string;
  url: string;
  imageFile: File | null;
  imagePreview: string | null;
}

const EMPTY_DRAFT: LinkDraft = {
  title: "",
  url: "",
  imageFile: null,
  imagePreview: null,
};

export function ProfileLinksEditor({
  creatorId,
  compact = false,
}: ProfileLinksEditorProps) {
  const [links, setLinks] = useState<ProfileLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [draft, setDraft] = useState<LinkDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<LinkDraft>(EMPTY_DRAFT);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const loadLinks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await profileLinkRepository.listByCreator(creatorId);
      setLinks(rows);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar links."
      );
    } finally {
      setLoading(false);
    }
  }, [creatorId]);

  useEffect(() => {
    void loadLinks();
  }, [loadLinks]);

  function revokePreview(url: string | null) {
    if (url?.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  }

  function handleDraftImage(file: File | null, isEdit = false) {
    if (!file) return;

    const imageError = validateProfileLinkImage(file);
    if (imageError) {
      setError(imageError);
      return;
    }

    const preview = URL.createObjectURL(file);
    if (isEdit) {
      revokePreview(editDraft.imagePreview);
      setEditDraft((prev) => ({
        ...prev,
        imageFile: file,
        imagePreview: preview,
      }));
    } else {
      revokePreview(draft.imagePreview);
      setDraft((prev) => ({
        ...prev,
        imageFile: file,
        imagePreview: preview,
      }));
    }
    setError(null);
  }

  function clearDraft(isEdit = false) {
    if (isEdit) {
      revokePreview(editDraft.imagePreview);
      setEditDraft(EMPTY_DRAFT);
      setEditingId(null);
    } else {
      revokePreview(draft.imagePreview);
      setDraft(EMPTY_DRAFT);
      setShowAddForm(false);
    }
  }

  async function handleCreate() {
    setError(null);

    const titleError = validateProfileLinkTitle(draft.title);
    const urlError = validateProfileLinkUrl(draft.url);
    if (titleError || urlError) {
      setError(titleError ?? urlError);
      return;
    }

    const normalizedUrl = normalizeProfileLinkUrl(draft.url);
    if (!normalizedUrl) {
      setError("Informe um link válido começando com https://");
      return;
    }

    setBusy(true);
    try {
      const created = await profileLinkRepository.create(creatorId, {
        title: draft.title.trim(),
        url: normalizedUrl,
      });

      if (draft.imageFile) {
        await profileLinkRepository.uploadImage(created.id, draft.imageFile);
      }

      clearDraft(false);
      await loadLinks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar link.");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(link: ProfileLink) {
    setEditingId(link.id);
    setEditDraft({
      title: link.title,
      url: link.url,
      imageFile: null,
      imagePreview: link.imagePath
        ? getProfileLinkImageUrl(link.id)
        : null,
    });
    setError(null);
  }

  async function handleUpdate() {
    if (!editingId) return;

    setError(null);

    const titleError = validateProfileLinkTitle(editDraft.title);
    const urlError = validateProfileLinkUrl(editDraft.url);
    if (titleError || urlError) {
      setError(titleError ?? urlError);
      return;
    }

    const normalizedUrl = normalizeProfileLinkUrl(editDraft.url);
    if (!normalizedUrl) {
      setError("Informe um link válido começando com https://");
      return;
    }

    setBusy(true);
    try {
      await profileLinkRepository.update(editingId, {
        title: editDraft.title.trim(),
        url: normalizedUrl,
      });

      if (editDraft.imageFile) {
        await profileLinkRepository.uploadImage(editingId, editDraft.imageFile);
      }

      clearDraft(true);
      await loadLinks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar link.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este link?")) return;

    setBusy(true);
    setError(null);
    try {
      await profileLinkRepository.delete(id);
      if (editingId === id) clearDraft(true);
      await loadLinks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover link.");
    } finally {
      setBusy(false);
    }
  }

  async function moveLink(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= links.length) return;

    const reordered = [...links];
    const [item] = reordered.splice(index, 1);
    reordered.splice(target, 0, item);

    setLinks(reordered);
    setBusy(true);
    setError(null);
    try {
      await profileLinkRepository.reorder(
        creatorId,
        reordered.map((link) => link.id)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao reordenar.");
      await loadLinks();
    } finally {
      setBusy(false);
    }
  }

  const atLimit = links.length >= PROFILE_LINK_LIMITS.maxLinks;

  if (loading) {
    return (
      <p className="text-muted-foreground text-sm">Carregando links...</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {links.length > 0 && (
        <ul className="flex flex-col gap-3">
          {links.map((link, index) =>
            editingId === link.id ? (
              <li
                key={link.id}
                className="rounded-xl border-2 border-border bg-muted/40 p-4"
              >
                <LinkForm
                  draft={editDraft}
                  onTitleChange={(value) =>
                    setEditDraft((prev) => ({ ...prev, title: value }))
                  }
                  onUrlChange={(value) =>
                    setEditDraft((prev) => ({ ...prev, url: value }))
                  }
                  onPickImage={() => editFileInputRef.current?.click()}
                  onClearImage={() => {
                    revokePreview(editDraft.imagePreview);
                    setEditDraft((prev) => ({
                      ...prev,
                      imageFile: null,
                      imagePreview: null,
                    }));
                  }}
                  fileInputRef={editFileInputRef}
                  onImageSelected={(file) => handleDraftImage(file, true)}
                  onSubmit={handleUpdate}
                  onCancel={() => clearDraft(true)}
                  submitLabel={busy ? "Salvando..." : "Salvar"}
                  disabled={busy}
                />
              </li>
            ) : (
              <li
                key={link.id}
                className="flex items-center gap-3 rounded-xl border-2 border-border bg-background p-3 shadow-cartoon-sm"
              >
                <LinkRowPreview link={link} />

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{link.title}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {link.url}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {!compact && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => moveLink(index, -1)}
                        disabled={busy || index === 0}
                        aria-label="Mover para cima"
                      >
                        <ChevronUp className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => moveLink(index, 1)}
                        disabled={busy || index === links.length - 1}
                        aria-label="Mover para baixo"
                      >
                        <ChevronDown className="size-4" />
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => startEdit(link)}
                    disabled={busy}
                    aria-label="Editar link"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(link.id)}
                    disabled={busy}
                    aria-label="Remover link"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            )
          )}
        </ul>
      )}

      {showAddForm ? (
        <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-4">
          <LinkForm
            draft={draft}
            onTitleChange={(value) =>
              setDraft((prev) => ({ ...prev, title: value }))
            }
            onUrlChange={(value) =>
              setDraft((prev) => ({ ...prev, url: value }))
            }
            onPickImage={() => fileInputRef.current?.click()}
            onClearImage={() => {
              revokePreview(draft.imagePreview);
              setDraft((prev) => ({
                ...prev,
                imageFile: null,
                imagePreview: null,
              }));
            }}
            fileInputRef={fileInputRef}
            onImageSelected={(file) => handleDraftImage(file, false)}
            onSubmit={handleCreate}
            onCancel={() => clearDraft(false)}
            submitLabel={busy ? "Adicionando..." : "Adicionar link"}
            disabled={busy}
          />
        </div>
      ) : (
        !atLimit && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setShowAddForm(true);
              setError(null);
            }}
            disabled={busy}
          >
            <Plus className="size-4" />
            Adicionar link
          </Button>
        )
      )}

      {atLimit && (
        <p className="text-muted-foreground text-xs">
          Limite de {PROFILE_LINK_LIMITS.maxLinks} links atingido.
        </p>
      )}

      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface LinkFormProps {
  draft: LinkDraft;
  onTitleChange: (value: string) => void;
  onUrlChange: (value: string) => void;
  onPickImage: () => void;
  onClearImage: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onImageSelected: (file: File) => void;
  onSubmit: () => void | Promise<void>;
  onCancel: () => void;
  submitLabel: string;
  disabled?: boolean;
}

function LinkForm({
  draft,
  onTitleChange,
  onUrlChange,
  onPickImage,
  onClearImage,
  fileInputRef,
  onImageSelected,
  onSubmit,
  onCancel,
  submitLabel,
  disabled,
}: LinkFormProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="link-title">Título</Label>
        <Input
          id="link-title"
          value={draft.title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Ex.: Meu canal no YouTube"
          maxLength={PROFILE_LINK_LIMITS.title.max}
          disabled={disabled}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="link-url">URL</Label>
        <Input
          id="link-url"
          type="url"
          value={draft.url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://..."
          disabled={disabled}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Imagem (opcional)</Label>
        <div className="flex items-center gap-3">
          {draft.imagePreview ? (
            <span className="relative size-14 overflow-hidden rounded-lg border-2 border-border">
              <Image
                src={draft.imagePreview}
                alt=""
                fill
                className="object-cover"
                sizes="56px"
                unoptimized
              />
            </span>
          ) : (
            <span className="flex size-14 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted">
              <Link2 className="size-5 text-muted-foreground" />
            </span>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onPickImage}
              disabled={disabled}
            >
              <ImagePlus className="size-4" />
              Escolher imagem
            </Button>
            {draft.imagePreview && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClearImage}
                disabled={disabled}
              >
                <X className="size-4" />
                Remover
              </Button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={PROFILE_LINK_IMAGE_ACCEPT}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImageSelected(file);
              e.target.value = "";
            }}
          />
        </div>
        <p className="text-muted-foreground text-xs">
          PNG, JPG, WEBP ou GIF. Máximo 5 MB.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={disabled}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          className="flex-1"
          disabled={disabled}
          onClick={() => void onSubmit()}
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

function LinkRowPreview({ link }: { link: ProfileLink }) {
  if (link.imagePath) {
    return (
      <span className="relative size-12 shrink-0 overflow-hidden rounded-lg border-2 border-border bg-muted">
        <Image
          src={getProfileLinkImageUrl(link.id)}
          alt=""
          fill
          className="object-cover"
          sizes="48px"
          unoptimized
        />
      </span>
    );
  }

  return (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border-2 border-border bg-muted">
      <Link2 className="size-5" />
    </span>
  );
}
