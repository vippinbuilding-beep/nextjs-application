"use client";

import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquareReply,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  authorLabel,
  COMMENT_BODY_MAX,
  type CommentNode,
  countDescendants,
  flattenReplies,
  replyIndentClass,
  threadContainsComment,
  validateCommentBody,
} from "@/lib/comments";
import { cn } from "@/lib/utils";

interface CommentThreadProps {
  nodes: CommentNode[];
  currentUserId?: string;
  isOwner: boolean;
  replyingToId: string | null;
  submitting: boolean;
  onStartReply: (commentId: string) => void;
  onCancelReply: () => void;
  onSubmitReply: (parentId: string, body: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
}

interface CommentCardProps {
  node: CommentNode;
  parent?: CommentNode;
  currentUserId?: string;
  isOwner: boolean;
  replyingToId: string | null;
  submitting: boolean;
  onStartReply: (commentId: string) => void;
  onCancelReply: () => void;
  onSubmitReply: (parentId: string, body: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
}

function CommentCard({
  node,
  parent,
  currentUserId,
  isOwner,
  replyingToId,
  submitting,
  onStartReply,
  onCancelReply,
  onSubmitReply,
  onDelete,
}: CommentCardProps) {
  const [replyBody, setReplyBody] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const isReplying = replyingToId === node.id;
  const canDelete =
    Boolean(currentUserId) &&
    (node.userId === currentUserId || isOwner);

  async function handleReplySubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateCommentBody(replyBody);
    if (validationError) {
      setReplyError(validationError);
      return;
    }
    setReplyError(null);
    await onSubmitReply(node.id, replyBody.trim());
    setReplyBody("");
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(node.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article className="w-full min-w-0 rounded-xl border-2 border-border bg-background p-2.5 shadow-cartoon-sm">
      {parent && parent.id !== node.id && (
        <p className="text-muted-foreground mb-2 text-xs font-medium">
          Em resposta a {authorLabel(parent)}
        </p>
      )}

      <div className="flex items-start gap-2.5">
        <UserAvatar
          userId={node.userId}
          name={authorLabel(node)}
          avatarPath={node.authorAvatarPath}
          avatarUrl={node.authorAvatarUrl}
          size="sm"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
            <div className="min-w-0 flex-1">
              {node.authorSlug ? (
                <Link
                  href={`/@${node.authorSlug}`}
                  className="block truncate text-sm font-bold hover:underline"
                >
                  {authorLabel(node)}
                </Link>
              ) : (
                <p className="truncate text-sm font-bold">{authorLabel(node)}</p>
              )}
              <p className="text-muted-foreground text-xs font-medium whitespace-nowrap">
                {formatDistanceToNow(node.createdAt, {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() =>
                  isReplying ? onCancelReply() : onStartReply(node.id)
                }
                disabled={submitting || deleting}
              >
                <MessageSquareReply className="size-3.5" />
              </Button>
              {canDelete && (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="h-8 px-2 text-xs text-black"
                  onClick={() => void handleDelete()}
                  disabled={submitting || deleting}
                  aria-label="Apagar comentário"
                >
                  {deleting ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </Button>
              )}
            </div>
          </div>

          <p className="mt-2 wrap-break-word text-sm">{node.body}</p>

          {isReplying && (
            <form
              onSubmit={(e) => void handleReplySubmit(e)}
              className="mt-2.5 flex flex-col gap-2 border-t-2 border-dashed border-border pt-2.5"
            >
              <Label htmlFor={`reply-${node.id}`} className="sr-only">
                Responder comentário
              </Label>
              <Textarea
                id={`reply-${node.id}`}
                value={replyBody}
                onChange={(e) =>
                  setReplyBody(e.target.value.slice(0, COMMENT_BODY_MAX))
                }
                maxLength={COMMENT_BODY_MAX}
                placeholder="Escreva sua resposta..."
                rows={3}
                disabled={submitting}
              />
              <p className="text-muted-foreground text-right text-xs">
                {replyBody.length}/{COMMENT_BODY_MAX}
              </p>
              {replyError && (
                <p className="text-destructive text-sm" role="alert">
                  {replyError}
                </p>
              )}
              <Button type="submit" size="sm" className="self-end" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar resposta"
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </article>
  );
}

function RootCommentThread({
  node,
  currentUserId,
  isOwner,
  replyingToId,
  submitting,
  onStartReply,
  onCancelReply,
  onSubmitReply,
  onDelete,
}: {
  node: CommentNode;
  currentUserId?: string;
  isOwner: boolean;
  replyingToId: string | null;
  submitting: boolean;
  onStartReply: (commentId: string) => void;
  onCancelReply: () => void;
  onSubmitReply: (parentId: string, body: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
}) {
  const replyCount = countDescendants(node);
  const [expanded, setExpanded] = useState(false);
  /** True when the user explicitly clicked "Ver respostas". */
  const [userExpanded, setUserExpanded] = useState(false);

  useEffect(() => {
    if (replyingToId && threadContainsComment(node, replyingToId)) {
      setExpanded(true);
    }
  }, [node, replyingToId]);

  function handleToggleReplies() {
    setExpanded((open) => {
      const next = !open;
      setUserExpanded(next);
      return next;
    });
  }

  function handleCancelReply() {
    onCancelReply();
    if (!userExpanded) {
      setExpanded(false);
    }
  }

  const cardProps = {
    currentUserId,
    isOwner,
    replyingToId,
    submitting,
    onStartReply,
    onCancelReply: handleCancelReply,
    onSubmitReply,
    onDelete,
  };

  return (
    <li className="flex w-full min-w-0 flex-col gap-2">
      <CommentCard node={node} {...cardProps} />

      {replyCount > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={handleToggleReplies}
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              <ChevronUp className="size-4" />
              Ocultar {replyCount === 1 ? "resposta" : "respostas"}
            </>
          ) : (
            <>
              <ChevronDown className="size-4" />
              Ver {replyCount}{" "}
              {replyCount === 1 ? "resposta" : "respostas"}
            </>
          )}
        </Button>
      )}

      {expanded && replyCount > 0 && (
        <ul className="flex w-full min-w-0 flex-col gap-2">
          {flattenReplies(node).map(({ node: reply, parent, depth }) => (
            <li
              key={reply.id}
              className={cn("box-border w-full min-w-0", replyIndentClass(depth))}
            >
              <CommentCard
                node={reply}
                parent={parent}
                {...cardProps}
              />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function CommentThread({
  nodes,
  currentUserId,
  isOwner,
  replyingToId,
  submitting,
  onStartReply,
  onCancelReply,
  onSubmitReply,
  onDelete,
}: CommentThreadProps) {
  if (nodes.length === 0) return null;

  return (
    <ul className="flex w-full min-w-0 flex-col gap-2">
      {nodes.map((node) => (
        <RootCommentThread
          key={node.id}
          node={node}
          currentUserId={currentUserId}
          isOwner={isOwner}
          replyingToId={replyingToId}
          submitting={submitting}
          onStartReply={onStartReply}
          onCancelReply={onCancelReply}
          onSubmitReply={onSubmitReply}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
