import type { NextRequest } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ASK_ME_ANSWERS_BUCKET } from "@/lib/supabase/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGNED_TTL_SECONDS = 3600;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: questionId } = await params;

  const server = await createSupabaseServerClient();
  const {
    data: { user },
  } = await server.auth.getUser();

  const admin = createSupabaseAdminClient();
  const { data: question } = await admin
    .from("ask_me_questions")
    .select("id, creator_id, asker_id, status, answer_video_path, answer_video_mime")
    .eq("id", questionId)
    .maybeSingle();

  if (!question?.answer_video_path) {
    return new Response("Not found", { status: 404 });
  }

  const isParticipant =
    user &&
    (user.id === question.asker_id || user.id === question.creator_id);

  if (!isParticipant && question.status !== "answered") {
    return new Response("Not found", { status: 404 });
  }

  const { data: signed, error } = await admin.storage
    .from(ASK_ME_ANSWERS_BUCKET)
    .createSignedUrl(question.answer_video_path, SIGNED_TTL_SECONDS);

  if (error || !signed?.signedUrl) {
    return new Response("Not found", { status: 404 });
  }

  const upstream = await fetch(signed.signedUrl, {
    next: { revalidate: 300 },
  });
  if (!upstream.ok || !upstream.body) {
    return new Response("Not found", { status: 404 });
  }

  const contentType =
    upstream.headers.get("content-type") ||
    question.answer_video_mime ||
    "video/mp4";

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=300",
      ...(upstream.headers.get("content-length")
        ? { "Content-Length": upstream.headers.get("content-length")! }
        : {}),
    },
  });
}
