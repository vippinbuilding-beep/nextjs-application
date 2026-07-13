import type { NextRequest } from "next/server";

import {
  finalizeAskMeQuestion,
  processExpiredAskMeQuestions,
} from "@/lib/payments/ask-me-finalize";
import { createSupabaseAdminClient } from "@vippin/supabase/client/admin";
import { createSupabaseServerClient } from "@vippin/supabase/client/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Polls ask-me payment status. Also processes expired questions globally.
 */
export async function GET(
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
  const { data: row } = await admin
    .from("ask_me_questions")
    .select("id, asker_id, creator_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!row) {
    return Response.json({ error: "Pergunta não encontrada." }, { status: 404 });
  }

  if (row.asker_id !== user.id && row.creator_id !== user.id) {
    return Response.json({ error: "Acesso negado." }, { status: 403 });
  }

  await processExpiredAskMeQuestions();

  const question = await finalizeAskMeQuestion(id);
  if (!question) {
    return Response.json({ error: "Pergunta não encontrada." }, { status: 404 });
  }

  return Response.json({
    status: question.status,
    responseDeadlineAt: question.responseDeadlineAt?.toISOString() ?? null,
  });
}
