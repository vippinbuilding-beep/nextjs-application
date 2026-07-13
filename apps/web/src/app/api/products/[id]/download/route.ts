import type { NextRequest } from "next/server";

import { verifyMediaToken } from "@/lib/security/media-token";
import { createSupabaseAdminClient } from "@vippin/supabase/client/admin";
import { PRODUCTS_BUCKET } from "@/lib/supabase/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Builds an RFC 5987 `Content-Disposition` value that survives non-ASCII names. */
function attachmentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "'");
  const encoded = encodeURIComponent(fileName);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

/**
 * Streams a document download through the server so the storage URL is never
 * exposed. Gated by a short-lived media token minted server-side.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = request.nextUrl.searchParams.get("token");

  if (!verifyMediaToken(token, id, "download")) {
    return new Response("Forbidden", { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  const { data: product } = await admin
    .from("products")
    .select("file_path, file_name, file_mime")
    .eq("id", id)
    .maybeSingle();

  if (!product?.file_path) {
    return new Response("Not found", { status: 404 });
  }

  const { data: signed, error } = await admin.storage
    .from(PRODUCTS_BUCKET)
    .createSignedUrl(product.file_path, 60);

  if (error || !signed?.signedUrl) {
    return new Response("Not found", { status: 404 });
  }

  const upstream = await fetch(signed.signedUrl, { cache: "no-store" });
  if (!upstream.ok) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("content-length", contentLength);
  headers.set(
    "content-type",
    product.file_mime || "application/octet-stream"
  );
  headers.set(
    "content-disposition",
    attachmentDisposition(product.file_name || "documento")
  );
  headers.set("cache-control", "private, no-store");

  return new Response(upstream.body, { status: 200, headers });
}
