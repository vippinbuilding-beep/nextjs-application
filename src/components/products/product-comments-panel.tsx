"use client";

import { Loader2 } from "lucide-react";
import { useCurrentReturnPath } from "@/hooks/use-current-return-path";
import { useCallback, useEffect, useState } from "react";

import { LoginRolePicker } from "@/components/auth/login-role-picker";
import { CommentThread } from "@/components/products/comment-thread";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProductComment } from "@/core/models/product-comment";
import {
  buildCommentTree,
  COMMENT_BODY_MAX,
  type CommentNode,
  validateCommentBody,
} from "@/lib/comments";
import { cn } from "@/lib/utils";
import { productCommentRepository } from "@/services/repository-factory";
import { toast, TOAST_MESSAGES } from "@/lib/toast";

type CommentPayload = Omit<ProductComment, "createdAt"> & { createdAt: string };

function parseComments(payload: CommentPayload[]): ProductComment[] {
  return payload.map((comment) => ({
    ...comment,
    createdAt: new Date(comment.createdAt),
  }));
}

interface ProductCommentsPanelProps {
  productId: string;
  isOwner: boolean;
  formId?: string;
  /** Set on gated product pages so the comment form does not flash login while auth hydrates. */
  viewerUserId?: string;
}

export function ProductCommentsPanel({
  productId,
  isOwner,
  formId = "comment-body",
  viewerUserId,
}: ProductCommentsPanelProps) {
  const returnPath = useCurrentReturnPath();
  const { user, loading: authLoading } = useAuth();
  const currentUserId = user?.id ?? viewerUserId;
  const [tree, setTree] = useState<CommentNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch(`/api/products/${productId}/comments`);
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "Não foi possível carregar os comentários.");
      }

      const payload = (await response.json()) as { comments: CommentPayload[] };
      setTree(buildCommentTree(parseComments(payload.comments)));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível carregar os comentários."
      );
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  async function handleCreate(bodyText: string, parentId?: string) {
    const validationError = validateCommentBody(bodyText);
    if (validationError) {
      if (parentId) throw new Error(validationError);
      setFormError(validationError);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setError(null);

    try {
      const response = await fetch(`/api/products/${productId}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          body: bodyText.trim(),
          parentId,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "Não foi possível enviar o comentário.");
      }

      if (!parentId) setBody("");
      setReplyingToId(null);
      await loadComments();
      toast.success(
        parentId ? "Resposta enviada." : TOAST_MESSAGES.commentSent
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível enviar o comentário.";
      if (parentId) throw new Error(message);
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRootSubmit(e: React.FormEvent) {
    e.preventDefault();
    await handleCreate(body);
  }

  async function handleSubmitReply(parentId: string, replyBody: string) {
    await handleCreate(replyBody, parentId);
  }

  async function handleDelete(commentId: string) {
    setError(null);
    try {
      await productCommentRepository.delete(commentId);
      if (replyingToId === commentId) setReplyingToId(null);
      await loadComments();
      toast.success(TOAST_MESSAGES.commentDeleted);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível apagar o comentário.";
      setError(message);
      toast.error(message);
      throw err;
    }
  }

  if (loading || (authLoading && !currentUserId)) {
    return (
      <div className="flex flex-col gap-4 px-1 py-0.5">
        <CommentFormSkeleton />
        <CommentsListSkeleton />
      </div>
    );
  }

  const showLoginPrompt = !currentUserId;

  return (
    <div className="flex flex-col gap-4 overflow-x-hidden px-1 py-0.5 h-full">
      {showLoginPrompt ? (
        <div className="flex flex-col gap-3 rounded-xl border-2 border-dashed border-border bg-muted px-4 py-5">
          <p className="text-muted-foreground text-sm">
            Escolha como quer entrar para comentar neste conteúdo.
          </p>
          <LoginRolePicker next={returnPath} />
        </div>
      ) : (
        <form onSubmit={(e) => void handleRootSubmit(e)} className="flex flex-col gap-2">
          <Label htmlFor={formId}>Novo comentário</Label>
          <Textarea
            id={formId}
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, COMMENT_BODY_MAX))}
            maxLength={COMMENT_BODY_MAX}
            placeholder="Compartilhe sua dúvida ou feedback..."
            rows={3}
            disabled={submitting || authLoading}
          />
          <p className="text-muted-foreground text-right text-xs">
            {body.length}/{COMMENT_BODY_MAX}
          </p>
          {formError && (
            <p className="text-destructive text-sm" role="alert">
              {formError}
            </p>
          )}
          <Button
            type="submit"
            className="self-end"
            disabled={submitting || authLoading}
          >
            {submitting && !replyingToId ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Comentar"
            )}
          </Button>
        </form>
      )}

      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}


      <CommentThread
        nodes={tree}
        currentUserId={currentUserId}
        isOwner={isOwner}
        replyingToId={replyingToId}
        submitting={submitting}
        onStartReply={setReplyingToId}
        onCancelReply={() => setReplyingToId(null)}
        onSubmitReply={handleSubmitReply}
        onDelete={handleDelete}
      />
    </div>
  );
}

const skeletonBase =
  "relative overflow-hidden rounded-xl border-2 border-border bg-muted shadow-cartoon-sm";

const shimmer =
  "after:absolute after:inset-0 after:-translate-x-full after:animate-[nav-shimmer_1.4s_ease-in-out_infinite] after:bg-linear-to-r after:from-transparent after:via-background/70 after:to-transparent";

function CommentFormSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Carregando formulário de comentário">
      <div className={cn(skeletonBase, shimmer, "h-4 w-32")} />
      <div className={cn(skeletonBase, shimmer, "h-20 w-full rounded-2xl")} />
      <div className={cn(skeletonBase, shimmer, "ml-auto h-9 w-24")} />
    </div>
  );
}

function CommentsListSkeleton() {
  return (
    <div className="flex flex-col gap-3 pt-2" aria-hidden>
      {[0, 1].map((key) => (
        <div key={key} className="flex gap-3">
          <div className={cn(skeletonBase, shimmer, "size-9 shrink-0 rounded-full")} />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className={cn(skeletonBase, shimmer, "h-3.5 w-28")} />
            <div className={cn(skeletonBase, shimmer, "h-14 w-full")} />
          </div>
        </div>
      ))}
    </div>
  );
}
