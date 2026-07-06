"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { CommentThread } from "@/components/products/comment-thread";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  buildCommentTree,
  COMMENT_BODY_MAX,
  type CommentNode,
  validateCommentBody,
} from "@/lib/comments";
import { productCommentRepository } from "@/services/repository-factory";
import { toast, TOAST_MESSAGES } from "@/lib/toast";

interface ProductCommentsPanelProps {
  productId: string;
  isOwner: boolean;
  formId?: string;
}

export function ProductCommentsPanel({
  productId,
  isOwner,
  formId = "comment-body",
}: ProductCommentsPanelProps) {
  const { user } = useAuth();
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
      const next = await productCommentRepository.listByProduct(productId);
      setTree(buildCommentTree(next));
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 overflow-x-hidden px-1 py-0.5 h-full">
      <form onSubmit={(e) => void handleRootSubmit(e)} className="flex flex-col gap-2">
        <Label htmlFor={formId}>Novo comentário</Label>
        <Textarea
          id={formId}
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, COMMENT_BODY_MAX))}
          maxLength={COMMENT_BODY_MAX}
          placeholder="Compartilhe sua dúvida ou feedback..."
          rows={3}
          disabled={submitting}
        />
        <p className="text-muted-foreground text-right text-xs">
          {body.length}/{COMMENT_BODY_MAX}
        </p>
        {formError && (
          <p className="text-destructive text-sm" role="alert">
            {formError}
          </p>
        )}
        <Button type="submit" className="self-end" disabled={submitting}>
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

      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}


      <CommentThread
        nodes={tree}
        currentUserId={user?.id}
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
