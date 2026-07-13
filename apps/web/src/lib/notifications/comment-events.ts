import "server-only";

import {
  notifyProductCommentReply,
  notifyProductNewComment,
  productPublicPath,
} from "@/lib/notifications/dispatch";
import { createSupabaseAdminClient } from "@vippin/supabase/client/admin";

type ProductRow = {
  id: string;
  title: string;
  slug: string;
  creator_id: string;
  profiles: { slug: string | null };
};

type ParentCommentRow = {
  user_id: string;
};

function resolveAuthorName(profile: {
  creator_name: string | null;
  consumer_name: string | null;
  name: string | null;
} | null): string {
  return (
    profile?.creator_name ??
    profile?.consumer_name ??
    profile?.name ??
    "Alguém"
  );
}

async function fetchProduct(productId: string): Promise<{
  title: string;
  href: string;
  creatorId: string;
} | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("products")
    .select("id, title, slug, creator_id, profiles!inner(slug)")
    .eq("id", productId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as ProductRow;
  const creatorSlug = row.profiles.slug;
  if (!creatorSlug) return null;

  return {
    title: row.title,
    href: productPublicPath(creatorSlug, row.slug),
    creatorId: row.creator_id,
  };
}

export async function dispatchCommentNotifications(input: {
  productId: string;
  commentId: string;
  authorId: string;
  parentId?: string;
}): Promise<void> {
  const product = await fetchProduct(input.productId);
  if (!product) return;

  const admin = createSupabaseAdminClient();
  const { data: authorProfile } = await admin
    .from("profiles")
    .select("creator_name, consumer_name, name")
    .eq("id", input.authorId)
    .maybeSingle();

  const authorName = resolveAuthorName(authorProfile);

  if (!input.parentId) {
    if (input.authorId !== product.creatorId) {
      await notifyProductNewComment({
        creatorId: product.creatorId,
        productId: input.productId,
        commentId: input.commentId,
        productTitle: product.title,
        productHref: product.href,
        authorName,
      });
    }
    return;
  }

  const { data: parent } = await admin
    .from("product_comments")
    .select("user_id")
    .eq("id", input.parentId)
    .maybeSingle();

  const parentAuthorId = (parent as ParentCommentRow | null)?.user_id;
  const tasks: Promise<void>[] = [];

  if (parentAuthorId && parentAuthorId !== input.authorId) {
    tasks.push(
      notifyProductCommentReply({
        recipientId: parentAuthorId,
        productId: input.productId,
        commentId: input.commentId,
        productTitle: product.title,
        productHref: product.href,
        authorName,
      })
    );
  }

  if (
    product.creatorId !== input.authorId &&
    product.creatorId !== parentAuthorId
  ) {
    tasks.push(
      notifyProductNewComment({
        creatorId: product.creatorId,
        productId: input.productId,
        commentId: input.commentId,
        productTitle: product.title,
        productHref: product.href,
        authorName,
      })
    );
  }

  await Promise.all(tasks);
}
