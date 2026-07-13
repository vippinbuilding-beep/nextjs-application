import type { NextRequest } from "next/server";

import { ASK_ME_LIMITS, canCreatorRespondToAskMe, getAskMeResponseBlockedMessage } from "@vippin/core/domain/ask-me";
import { createSupabaseAdminClient } from "@vippin/supabase/client/admin";
import { createSupabaseServerClient } from "@vippin/supabase/client/server";
import { ASK_ME_ANSWERS_BUCKET, sanitizeFileName } from "@/lib/supabase/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface UploadUrlBody {
  fileName?: string;
  contentType?: string;
  size?: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: questionId } = await params;

  const server = await createSupabaseServerClient();
  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data: question } = await admin
    .from("ask_me_questions")
    .select("id, creator_id, status, response_deadline_at")
    .eq("id", questionId)
    .maybeSingle();

  if (!question || question.creator_id !== user.id) {
    return Response.json({ error: "Pergunta não encontrada." }, { status: 404 });
  }
  const responseDeadlineAt = question.response_deadline_at
    ? new Date(question.response_deadline_at)
    : null;
  if (!canCreatorRespondToAskMe(question.status, responseDeadlineAt)) {
    return Response.json(
      {
        error: getAskMeResponseBlockedMessage(
          question.status,
          responseDeadlineAt
        ),
      },
      { status: 400 }
    );
  }

  let body: UploadUrlBody;
  try {
    body = (await request.json()) as UploadUrlBody;
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const fileName = typeof body.fileName === "string" ? body.fileName : "";
  const size = typeof body.size === "number" ? body.size : 0;
  const contentType =
    typeof body.contentType === "string" ? body.contentType : "";

  if (!fileName) {
    return Response.json({ error: "Nome de arquivo ausente." }, { status: 400 });
  }
  if (contentType && !contentType.startsWith("video/")) {
    return Response.json({ error: "Envie um arquivo de vídeo." }, { status: 400 });
  }
  if (size > ASK_ME_LIMITS.videoMaxSize) {
    return Response.json({ error: "Vídeo muito grande." }, { status: 400 });
  }

  const path = `${user.id}/${questionId}/${sanitizeFileName(fileName)}`;

  const { data: signed, error } = await admin.storage
    .from(ASK_ME_ANSWERS_BUCKET)
    .createSignedUploadUrl(path, { upsert: true });

  if (error || !signed) {
    return Response.json(
      { error: error?.message ?? "Falha ao gerar URL de upload." },
      { status: 500 }
    );
  }

  return Response.json({ path, token: signed.token });
}
