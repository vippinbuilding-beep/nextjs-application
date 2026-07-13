import "server-only";

import type { ProductComment } from "@vippin/core/models/product-comment";
import { createSupabaseAdminClient } from "@vippin/supabase/client/admin";
import { createSupabaseServerClient } from "@vippin/supabase/client/server";

type CommentRow = {
  id: string;
  product_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string | null;
};

type AuthorRow = {
  id: string;
  role: string | null;
  creator_name: string | null;
  consumer_name: string | null;
  slug: string | null;
  avatar_path: string | null;
  avatar_url: string | null;
};

export function resolveCommentAuthorName(author: AuthorRow | undefined): string {
  if (!author) return "Usuário";

  const creatorName = author.creator_name?.trim();
  const consumerName = author.consumer_name?.trim();

  if (author.role === "consumer") {
    return consumerName || creatorName || "Usuário";
  }

  return creatorName || consumerName || "Usuário";
}

function toProductComment(
  row: CommentRow,
  authors: Map<string, AuthorRow>
): ProductComment {
  const author = authors.get(row.user_id);
  return {
    id: row.id,
    productId: row.product_id,
    userId: row.user_id,
    parentId: row.parent_id ?? undefined,
    body: row.body,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    authorSlug: author?.slug ?? undefined,
    authorName: resolveCommentAuthorName(author),
    authorAvatarPath: author?.avatar_path ?? null,
    authorAvatarUrl: author?.avatar_url ?? null,
  };
}

async function fetchAuthors(userIds: string[]): Promise<Map<string, AuthorRow>> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return new Map();

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, role, creator_name, consumer_name, slug, avatar_path, avatar_url")
    .in("id", unique);

  if (error) throw new Error(error.message);

  return new Map((data as AuthorRow[]).map((profile) => [profile.id, profile]));
}

/** Lists comments with author names (service role — consumers without public slug included). */
export async function listProductCommentsForProduct(
  productId: string
): Promise<ProductComment[]> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("product_comments")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as CommentRow[];
  const authors = await fetchAuthors(rows.map((row) => row.user_id));
  return rows.map((row) => toProductComment(row, authors));
}

async function userHasProductAccess(
  userId: string,
  productId: string
): Promise<boolean> {
  const admin = createSupabaseAdminClient();

  const { data: product } = await admin
    .from("products")
    .select("creator_id")
    .eq("id", productId)
    .maybeSingle();

  if (!product) return false;
  if (product.creator_id === userId) return true;

  const { count } = await admin
    .from("product_accesses")
    .select("product_id", { count: "exact", head: true })
    .eq("product_id", productId)
    .eq("user_id", userId);

  return (count ?? 0) > 0;
}

/** Ensures the signed-in user may read/write comments on this product. */
export async function assertProductCommentAccess(
  productId: string
): Promise<{ ok: true; userId: string } | { ok: false; status: number; error: string }> {
  const server = await createSupabaseServerClient();
  const {
    data: { user },
  } = await server.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: "Faça login para ver os comentários." };
  }

  try {
    const hasAccess = await userHasProductAccess(user.id, productId);
    if (!hasAccess) {
      return { ok: false, status: 403, error: "Acesso negado." };
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Não foi possível verificar o acesso.";
    return { ok: false, status: 500, error: message };
  }

  return { ok: true, userId: user.id };
}

export async function getProductCommentById(
  commentId: string
): Promise<ProductComment | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("product_comments")
    .select("*")
    .eq("id", commentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as CommentRow;
  const authors = await fetchAuthors([row.user_id]);
  return toProductComment(row, authors);
}
