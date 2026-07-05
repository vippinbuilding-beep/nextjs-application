import type { NextRequest } from "next/server";

import { SupabaseAskMeQuestionRepository } from "@/infrastructure/supabase/supabase-ask-me-repository";
import { validateAskMeAnswerText } from "@/lib/ask-me";
import { notifyAskMeAnswered } from "@/lib/notifications/dispatch";
import {
  processExpiredAskMeQuestions,
  refundAskMeQuestion,
  repassAskMeToCreator,
} from "@/lib/payments/ask-me-finalize";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AnswerBody {
  answerText?: string;
  answerVideoPath?: string;
  answerVideoMime?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const server = await createSupabaseServerClient();
  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: AnswerBody;
  try {
    body = (await request.json()) as AnswerBody;
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const answerText =
    typeof body.answerText === "string" ? body.answerText.trim() : "";
  const answerVideoPath =
    typeof body.answerVideoPath === "string" ? body.answerVideoPath : undefined;
  const answerVideoMime =
    typeof body.answerVideoMime === "string" ? body.answerVideoMime : undefined;

  if (!answerText && !answerVideoPath) {
    return Response.json(
      { error: "Envie uma resposta em texto ou vídeo." },
      { status: 400 }
    );
  }

  if (answerText) {
    const textError = validateAskMeAnswerText(answerText);
    if (textError) {
      return Response.json({ error: textError }, { status: 400 });
    }
  }

  const admin = createSupabaseAdminClient();
  const repo = new SupabaseAskMeQuestionRepository(admin);

  await processExpiredAskMeQuestions();

  const question = await repo.getById(id);
  if (!question) {
    return Response.json({ error: "Pergunta não encontrada." }, { status: 404 });
  }
  if (question.creatorId !== user.id) {
    return Response.json({ error: "Acesso negado." }, { status: 403 });
  }
  if (question.status !== "awaiting_response") {
    return Response.json(
      { error: "Esta pergunta não está mais aguardando resposta." },
      { status: 400 }
    );
  }

  if (
    answerVideoPath &&
    !answerVideoPath.startsWith(`${user.id}/${id}/`)
  ) {
    return Response.json({ error: "Vídeo inválido." }, { status: 400 });
  }

  const answered = await repo.update(id, {
    status: "answered",
    answerText: answerText || null,
    answerVideoPath: answerVideoPath ?? null,
    answerVideoMime: answerVideoMime ?? null,
    answeredAt: new Date(),
  });

  if (!answered) {
    return Response.json({ error: "Falha ao salvar resposta." }, { status: 500 });
  }

  await repassAskMeToCreator(id);

  const { data: creator } = await admin
    .from("profiles")
    .select("creator_name, name")
    .eq("id", user.id)
    .maybeSingle();
  const creatorName = creator?.creator_name ?? creator?.name ?? "criador";

  await notifyAskMeAnswered({
    askerId: answered.askerId,
    questionId: answered.id,
    creatorName,
  });

  return Response.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const server = await createSupabaseServerClient();
  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const repo = new SupabaseAskMeQuestionRepository(admin);

  const question = await repo.getById(id);
  if (!question) {
    return Response.json({ error: "Pergunta não encontrada." }, { status: 404 });
  }
  if (question.creatorId !== user.id) {
    return Response.json({ error: "Acesso negado." }, { status: 403 });
  }
  if (question.status !== "awaiting_response") {
    return Response.json(
      { error: "Esta pergunta não pode mais ser recusada." },
      { status: 400 }
    );
  }

  const refunded = await refundAskMeQuestion(id, "declined");
  if (!refunded || refunded.status !== "declined") {
    return Response.json(
      { error: refunded?.transferError ?? "Falha ao estornar pagamento." },
      { status: 502 }
    );
  }

  return Response.json({ ok: true });
}
