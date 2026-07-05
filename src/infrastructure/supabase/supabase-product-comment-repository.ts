import type { ProductComment } from "@/core/models/product-comment";
import type {
  ProductCommentInput,
  ProductCommentRepository,
} from "@/core/repositories/product-comment-repository";
import { supabase } from "@/lib/supabase/client";

const TABLE = "product_comments";

type ProductCommentRow = {
  id: string;
  product_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string | null;
};

type PublicProfileRow = {
  id: string;
  slug: string | null;
  creator_name: string | null;
  avatar_path: string | null;
  avatar_url: string | null;
};

function mapWriteError(error: { code?: string; message: string }): Error {
  const msg = error.message.toLowerCase();
  if (error.code === "23514" || msg.includes("product_comments_body_len")) {
    return new Error("O comentário precisa ter entre 1 e 500 caracteres.");
  }
  if (msg.includes("comentário pai não encontrado")) {
    return new Error("Não foi possível responder a este comentário.");
  }
  if (msg.includes("mesmo produto")) {
    return new Error("A resposta precisa ser no mesmo produto.");
  }
  return new Error(error.message);
}

async function fetchAuthorMap(
  userIds: string[]
): Promise<Map<string, PublicProfileRow>> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return new Map();

  const { data, error } = await supabase
    .from("public_profiles")
    .select("id, slug, creator_name, avatar_path, avatar_url")
    .in("id", unique);

  if (error) throw new Error(error.message);

  return new Map(
    (data as PublicProfileRow[]).map((profile) => [profile.id, profile])
  );
}

function toProductComment(
  row: ProductCommentRow,
  authors: Map<string, PublicProfileRow>
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
    authorName: author?.creator_name ?? undefined,
    authorAvatarPath: author?.avatar_path ?? null,
    authorAvatarUrl: author?.avatar_url ?? null,
  };
}

export class SupabaseProductCommentRepository implements ProductCommentRepository {
  async listByProduct(productId: string): Promise<ProductComment[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as ProductCommentRow[];
    const authors = await fetchAuthorMap(rows.map((row) => row.user_id));
    return rows.map((row) => toProductComment(row, authors));
  }

  async create(
    productId: string,
    input: ProductCommentInput
  ): Promise<ProductComment> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Faça login para comentar.");

    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        product_id: productId,
        user_id: user.id,
        parent_id: input.parentId ?? null,
        body: input.body.trim(),
      })
      .select("*")
      .single();

    if (error) throw mapWriteError(error);

    const authors = await fetchAuthorMap([user.id]);
    return toProductComment(data as ProductCommentRow, authors);
  }

  async delete(commentId: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq("id", commentId);
    if (error) throw new Error(error.message);
  }
}
