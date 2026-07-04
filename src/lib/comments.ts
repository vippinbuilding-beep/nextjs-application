import type { ProductComment } from "@/core/models/product-comment";

export const COMMENT_BODY_MIN = 1;
export const COMMENT_BODY_MAX = 500;

export interface CommentNode extends ProductComment {
  replies: CommentNode[];
}

export function validateCommentBody(body: string): string | null {
  const trimmed = body.trim();
  if (trimmed.length < COMMENT_BODY_MIN) {
    return "Escreva um comentário antes de enviar.";
  }
  if (trimmed.length > COMMENT_BODY_MAX) {
    return `O comentário pode ter no máximo ${COMMENT_BODY_MAX} caracteres.`;
  }
  return null;
}

/** Builds a nested tree from a flat list ordered by createdAt. */
export function buildCommentTree(comments: ProductComment[]): CommentNode[] {
  const nodes = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const comment of comments) {
    nodes.set(comment.id, { ...comment, replies: [] });
  }

  for (const comment of comments) {
    const node = nodes.get(comment.id)!;
    if (comment.parentId && nodes.has(comment.parentId)) {
      nodes.get(comment.parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export function authorLabel(
  comment: Pick<CommentNode, "authorName" | "authorSlug">
): string {
  if (comment.authorName) return comment.authorName;
  if (comment.authorSlug) return `@${comment.authorSlug}`;
  return "Usuário";
}

/** Total number of replies in a thread (all descendants). */
export function countDescendants(node: CommentNode): number {
  return node.replies.reduce(
    (total, reply) => total + 1 + countDescendants(reply),
    0
  );
}

export interface FlatReplyItem {
  node: CommentNode;
  parent: CommentNode;
  /** Nesting depth under the root (1 = direct reply). */
  depth: number;
}

/** Flattens all replies under a root comment in chronological order. */
export function flattenReplies(
  node: CommentNode,
  parent: CommentNode = node,
  depth = 1
): FlatReplyItem[] {
  const result: FlatReplyItem[] = [];

  for (const reply of node.replies) {
    result.push({ node: reply, parent, depth });
    result.push(...flattenReplies(reply, reply, depth + 1));
  }

  return result;
}

const MAX_REPLY_INDENT_DEPTH = 4;

/** Slight left padding per reply level (padding avoids horizontal overflow). */
export function replyIndentClass(depth: number): string {
  const capped = Math.min(depth, MAX_REPLY_INDENT_DEPTH);
  if (capped <= 0) return "";
  if (capped === 1) return "pl-4";
  if (capped === 2) return "pl-8";
  if (capped === 3) return "pl-12";
  return "pl-16";
}

/** True when `commentId` is the root or any of its descendants. */
export function threadContainsComment(
  root: CommentNode,
  commentId: string
): boolean {
  if (root.id === commentId) return true;
  return root.replies.some((reply) => threadContainsComment(reply, commentId));
}
