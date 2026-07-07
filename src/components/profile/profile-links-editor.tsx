"use client";

import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ProfileLinkThumbnail } from "@/components/profile/profile-link-thumbnail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProfileLink } from "@/core/models/profile-link";
import { suggestProfileLinkTitle } from "@/lib/profile-link-platforms";
import {
  normalizeProfileLinkUrl,
  PROFILE_LINK_LIMITS,
  validateProfileLinkTitle,
  validateProfileLinkUrl,
} from "@/lib/profile-links";
import { profileLinkRepository } from "@/services/repository-factory";
import { toast } from "@/lib/toast";

interface ProfileLinksEditorProps {
  creatorId: string;
  /** When true, hides reorder controls and uses a simpler layout for onboarding. */
  compact?: boolean;
}

interface LinkDraft {
  title: string;
  url: string;
}

const EMPTY_DRAFT: LinkDraft = {
  title: "",
  url: "",
};

function applySuggestedTitle(prev: LinkDraft, url: string): LinkDraft {
  const suggested = suggestProfileLinkTitle(url);
  if (!suggested) return { ...prev, url };

  const shouldSuggest = !prev.title.trim() || prev.title === suggestProfileLinkTitle(prev.url);
  return {
    ...prev,
    url,
    title: shouldSuggest ? suggested : prev.title,
  };
}

async function resolveLinkPreview(linkId: string) {
  await fetch(`/api/profile/links/${linkId}/resolve-preview`, {
    method: "POST",
  });
}

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
  const backfilledPreviews = useRef(false);

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

  useEffect(() => {
    if (loading || backfilledPreviews.current) return;

    const missingPreview = links.filter((link) => !link.imagePath);
    if (missingPreview.length === 0) return;

    backfilledPreviews.current = true;
    void (async () => {
      for (const link of missingPreview) {
        await resolveLinkPreview(link.id);
      }
      await loadLinks();
    })();
  }, [loading, links, loadLinks]);

  function clearDraft(isEdit = false) {
    if (isEdit) {
      setEditDraft(EMPTY_DRAFT);
      setEditingId(null);
    } else {
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

      await resolveLinkPreview(created.id);
      clearDraft(false);
      await loadLinks();
      toast.added();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao adicionar link.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(link: ProfileLink) {
    setEditingId(link.id);
    setEditDraft({
      title: link.title,
      url: link.url,
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

      await resolveLinkPreview(editingId);
      clearDraft(true);
      await loadLinks();
      toast.saved();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao salvar link.";
      setError(message);
      toast.error(message);
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
      toast.removed();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao remover link.";
      setError(message);
      toast.error(message);
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
      const message = err instanceof Error ? err.message : "Erro ao reordenar.";
      setError(message);
      toast.error(message);
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
                  storedPreview={{
                    linkId: link.id,
                    imagePath: link.imagePath,
                    originalUrl: link.url,
                  }}
                  onTitleChange={(value) =>
                    setEditDraft((prev) => ({ ...prev, title: value }))
                  }
                  onUrlChange={(value) =>
                    setEditDraft((prev) => applySuggestedTitle(prev, value))
                  }
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
                <ProfileLinkThumbnail
                  url={link.url}
                  title={link.title}
                  linkId={link.id}
                  imagePath={link.imagePath}
                />

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
                    disabled={busy || editingId !== null}
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
              setDraft((prev) => applySuggestedTitle(prev, value))
            }
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
  storedPreview?: {
    linkId: string;
    imagePath?: string;
    originalUrl: string;
  };
  onTitleChange: (value: string) => void;
  onUrlChange: (value: string) => void;
  onSubmit: () => void | Promise<void>;
  onCancel: () => void;
  submitLabel: string;
  disabled?: boolean;
}

function useLinkPreviewUrl(url: string) {
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const normalized = normalizeProfileLinkUrl(url);
    if (!normalized) {
      setPreviewImageUrl(null);
      return;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch(
            `/api/profile/links/preview?url=${encodeURIComponent(normalized)}`
          );
          const body = (await response.json()) as {
            previewImageUrl?: string | null;
          };
          setPreviewImageUrl(body.previewImageUrl ?? null);
        } catch {
          setPreviewImageUrl(null);
        }
      })();
    }, 500);

    return () => window.clearTimeout(timer);
  }, [url]);

  return previewImageUrl;
}

function LinkForm({
  draft,
  storedPreview,
  onTitleChange,
  onUrlChange,
  onSubmit,
  onCancel,
  submitLabel,
  disabled,
}: LinkFormProps) {
  const urlChanged =
    storedPreview != null && draft.url.trim() !== storedPreview.originalUrl;
  const livePreviewUrl = useLinkPreviewUrl(urlChanged ? draft.url : "");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <ProfileLinkThumbnail
          url={draft.url}
          title={draft.title}
          linkId={urlChanged ? undefined : storedPreview?.linkId}
          imagePath={urlChanged ? undefined : storedPreview?.imagePath}
          livePreviewUrl={urlChanged ? livePreviewUrl : undefined}
          size="sm"
        />
        <p className="text-muted-foreground text-xs font-medium">
          Ao salvar, buscamos o ícone do seu perfil e guardamos no Vippin. Se
          não achar, usamos o ícone da plataforma.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="link-url">URL</Label>
        <Input
          id="link-url"
          type="url"
          value={draft.url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://instagram.com/seu-perfil"
          disabled={disabled}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="link-title">Título</Label>
        <Input
          id="link-title"
          value={draft.title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Ex.: Meu Instagram"
          maxLength={PROFILE_LINK_LIMITS.title.max}
          disabled={disabled}
        />
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
