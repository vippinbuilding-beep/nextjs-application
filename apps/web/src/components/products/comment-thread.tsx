"use client";

import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquareReply,
  MoreVertical,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@vippin/ui/button";
import { Label } from "@vippin/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@vippin/ui/popover";
import { Textarea } from "@vippin/ui/textarea";
import {
  authorLabel,
  COMMENT_BODY_MAX,
  type CommentNode,
  countDescendants,
  flattenReplies,
  threadContainsComment,
  validateCommentBody,
} from "@/lib/comments";
import { cn } from "@vippin/ui/lib/utils";

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

interface CommentActionsMenuProps {
  nodeId: string;
  isReplying: boolean;
  canDelete: boolean;
  submitting: boolean;
  deleting: boolean;
  onStartReply: (commentId: string) => void;
  onCancelReply: () => void;
  onDelete: () => Promise<void>;
}

function CommentActionsMenu({
  nodeId,
  isReplying,
  canDelete,
  submitting,
  deleting,
  onStartReply,
  onCancelReply,
  onDelete,
}: CommentActionsMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="size-8 shrink-0 p-0"
          aria-label="Opções do comentário"
          disabled={submitting || deleting}
        >
          <MoreVertical className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        <button
          type="button"
          className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted"
          onClick={() => {
            setOpen(false);
            if (isReplying) {
              onCancelReply();
            } else {
              onStartReply(nodeId);
            }
          }}
          disabled={submitting || deleting}
        >
          <MessageSquareReply className="size-4 shrink-0" />
          {isReplying ? "Cancelar resposta" : "Responder"}
        </button>
        {canDelete && (
          <button
            type="button"
            className="text-destructive hover:bg-destructive/10 flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors"
            onClick={() => {
              setOpen(false);
              void onDelete();
            }}
            disabled={submitting || deleting}
          >
            {deleting ? (
              <Loader2 className="size-4 shrink-0 animate-spin" />
            ) : (
              <Trash2 className="size-4 shrink-0" />
            )}
            Apagar
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
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
    try {
      await onSubmitReply(node.id, replyBody.trim());
      setReplyBody("");
    } catch (err) {
      setReplyError(
        err instanceof Error ? err.message : "Não foi possível enviar a resposta."
      );
    }
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
    <article className="w-full min-w-0 rounded-xl border border-border bg-background p-2.5">
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
                  className="block truncate text-sm font-semibold hover:underline"
                >
                  {authorLabel(node)}
                </Link>
              ) : (
                <p className="truncate text-sm font-semibold">{authorLabel(node)}</p>
              )}
              <p className="text-muted-foreground text-xs font-medium whitespace-nowrap">
                {formatDistanceToNow(node.createdAt, {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </p>
            </div>
            <CommentActionsMenu
              nodeId={node.id}
              isReplying={isReplying}
              canDelete={canDelete}
              submitting={submitting}
              deleting={deleting}
              onStartReply={onStartReply}
              onCancelReply={onCancelReply}
              onDelete={handleDelete}
            />
          </div>

          <p className="mt-2 wrap-break-word text-sm">{node.body}</p>

          {isReplying && (
            <form
              onSubmit={(e) => void handleReplySubmit(e)}
              className="mt-2.5 flex flex-col gap-2 border-t border-dashed border-border pt-2.5"
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
  isNew,
}: {
  node: CommentNode;
  /** Chegou depois da lista carregar (acabou de ser enviado): entra animado. */
  isNew: boolean;
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
    <li
      className={cn(
        "flex w-full min-w-0 flex-col gap-2",
        isNew && "animate-in fade-in-0 slide-in-from-top-3 duration-[420ms] ease-spring"
      )}
    >
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
          {flattenReplies(node).map(({ node: reply, parent }, index) => (
            // Respostas só aparecem por ação (abrir ou responder): entram em
            // cascata curta.
            <li
              key={reply.id}
              style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}
              className="animate-in fade-in-0 slide-in-from-top-2 fill-mode-both box-border w-full min-w-0 pl-4 duration-300 ease-spring-soft"
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
  // Comentários que já estavam lá quando a lista apareceu não animam; só os
  // que chegam depois (acabaram de ser enviados).
  const initialIds = useRef<Set<string> | null>(null);
  if (initialIds.current === null && nodes.length > 0) {
    initialIds.current = new Set(nodes.map((node) => node.id));
  }

  if (nodes.length === 0) return null;

  return (
    <ul className="flex w-full min-w-0 flex-col gap-2">
      {nodes.map((node) => (
        <RootCommentThread
          key={node.id}
          node={node}
          isNew={!initialIds.current?.has(node.id)}
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
