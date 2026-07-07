import type { NextRequest } from "next/server";

import type { ProductComment } from "@/core/models/product-comment";
import { COMMENT_BODY_MAX } from "@/lib/comments";
import { dispatchCommentNotifications } from "@/lib/notifications/comment-events";
import {
  assertProductCommentAccess,
  getProductCommentById,
  listProductCommentsForProduct,
} from "@/lib/products/product-comments-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CommentBody {
  body?: string;
  parentId?: string;
}

function mapWriteError(error: { code?: string; message: string }): string {
  const msg = error.message.toLowerCase();
  if (error.code === "23514" || msg.includes("product_comments_body_len")) {
    return "O comentário precisa ter entre 1 e 500 caracteres.";
  }
  if (msg.includes("comentário pai não encontrado")) {
    return "Não foi possível responder a este comentário.";
  }
  if (msg.includes("mesmo produto")) {
    return "A resposta precisa ser no mesmo produto.";
  }
  return error.message;
}

function serializeComment(comment: ProductComment) {
  return {
    ...comment,
    createdAt: comment.createdAt.toISOString(),
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params;

  const access = await assertProductCommentAccess(productId);
  if (!access.ok) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  try {
    const comments = await listProductCommentsForProduct(productId);
    return Response.json({ comments: comments.map(serializeComment) });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Não foi possível carregar os comentários.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params;

  const server = await createSupabaseServerClient();
  const {
    data: { user },
  } = await server.auth.getUser();

  if (!user) {
    return Response.json({ error: "Faça login para comentar." }, { status: 401 });
  }

  let payload: CommentBody;
  try {
    payload = (await request.json()) as CommentBody;
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const body = payload.body?.trim() ?? "";
  if (body.length < 1 || body.length > COMMENT_BODY_MAX) {
    return Response.json(
      { error: "O comentário precisa ter entre 1 e 500 caracteres." },
      { status: 400 }
    );
  }

  const { data, error } = await server
    .from("product_comments")
    .insert({
      product_id: productId,
      user_id: user.id,
      parent_id: payload.parentId ?? null,
      body,
    })
    .select("id")
    .single();

  if (error) {
    return Response.json({ error: mapWriteError(error) }, { status: 400 });
  }

  await dispatchCommentNotifications({
    productId,
    commentId: data.id as string,
    authorId: user.id,
    parentId: payload.parentId,
  });

  const comment = await getProductCommentById(data.id as string);
  if (!comment) {
    return Response.json({ ok: true, id: data.id });
  }

  return Response.json({ ok: true, comment: serializeComment(comment) });
}
