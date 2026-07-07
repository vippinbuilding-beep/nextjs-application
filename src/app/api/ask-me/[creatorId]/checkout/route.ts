import type { NextRequest } from "next/server";

import { SupabaseAskMeQuestionRepository } from "@/infrastructure/supabase/supabase-ask-me-repository";
import {
  ASK_ME_LIMITS,
  inferRefundPixKeyType,
  resolveAskMePriceCents,
  validateAskMeQuestion,
  validateRefundPixKey,
} from "@/lib/ask-me";
import { splitAmount, validateGrossCoversSaleFees } from "@/lib/payments/split";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPaymentGateway } from "@/services/payment-factory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHARGE_TTL_SECONDS = 60 * 60;

interface CheckoutBody {
  questionText?: string;
  refundPixKey?: string;
}

/**
 * Opens a PIX checkout for an ask-me question. Payment is held until the creator
 * answers or the 72h deadline passes.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  const { creatorId } = await params;

  const server = await createSupabaseServerClient();
  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  if (user.id === creatorId) {
    return Response.json(
      { error: "Você não pode enviar uma pergunta para si mesmo." },
      { status: 400 }
    );
  }

  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const questionText =
    typeof body.questionText === "string" ? body.questionText : "";
  const questionError = validateAskMeQuestion(questionText);
  if (questionError) {
    return Response.json({ error: questionError }, { status: 400 });
  }

  const refundPixKey =
    typeof body.refundPixKey === "string" ? body.refundPixKey.trim() : "";
  const refundPixError = validateRefundPixKey(refundPixKey);
  if (refundPixError) {
    return Response.json({ error: refundPixError }, { status: 400 });
  }

  const refundPixKeyType = inferRefundPixKeyType(refundPixKey);
  if (!refundPixKeyType) {
    return Response.json({ error: "Chave PIX de reembolso inválida." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { data: creator } = await admin
    .from("profiles")
    .select("id, ask_me_enabled, ask_me_price_cents, pix_key")
    .eq("id", creatorId)
    .maybeSingle();

  if (!creator?.ask_me_enabled) {
    return Response.json(
      { error: "Este criador não aceita perguntas no momento." },
      { status: 400 }
    );
  }

  if (!creator.pix_key) {
    return Response.json(
      { error: "O criador ainda não pode receber pagamentos." },
      { status: 400 }
    );
  }

  const priceCents = resolveAskMePriceCents(
    true,
    creator.ask_me_price_cents
  );
  const split = splitAmount(priceCents);
  const splitError = validateGrossCoversSaleFees(priceCents);
  if (splitError) {
    return Response.json({ error: splitError }, { status: 400 });
  }

  const repo = new SupabaseAskMeQuestionRepository(admin);

  const { data: existing } = await admin
    .from("ask_me_questions")
    .select("id, br_code, br_code_base64, charge_expires_at, amount_cents")
    .eq("asker_id", user.id)
    .eq("creator_id", creatorId)
    .eq("status", "pending_payment")
    .not("abacate_charge_id", "is", null)
    .gt("charge_expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.br_code && existing.br_code_base64) {
    return Response.json({
      questionId: existing.id,
      amountCents: existing.amount_cents,
      brCode: existing.br_code,
      brCodeBase64: existing.br_code_base64,
      expiresAt: existing.charge_expires_at,
    });
  }

  const question = await repo.create({
    creatorId,
    askerId: user.id,
    questionText,
    amountCents: split.amountCents,
    platformFeeCents: split.platformFeeCents,
    creatorAmountCents: split.creatorAmountCents,
    refundPixKey,
    refundPixKeyType: refundPixKeyType.toLowerCase(),
  });

  const gateway = getPaymentGateway();

  try {
    const charge = await gateway.createPixCharge({
      amountCents: split.amountCents,
      description: "Me Pergunte — Vippin",
      expiresInSeconds: CHARGE_TTL_SECONDS,
      metadata: { askMeQuestionId: question.id },
    });

    const updated = await repo.update(question.id, {
      abacateChargeId: charge.id,
      brCode: charge.brCode,
      brCodeBase64: charge.brCodeBase64,
      chargeExpiresAt: charge.expiresAt ?? null,
    });

    return Response.json({
      questionId: question.id,
      amountCents: split.amountCents,
      brCode: charge.brCode,
      brCodeBase64: charge.brCodeBase64,
      expiresAt: (updated?.chargeExpiresAt ?? charge.expiresAt)?.toISOString() ?? null,
      responseDeadlineHours: ASK_ME_LIMITS.responseDeadlineHours,
    });
  } catch (err) {
    await repo.update(question.id, { status: "failed" });
    const message =
      err instanceof Error ? err.message : "Falha ao gerar a cobrança PIX.";
    return Response.json({ error: message }, { status: 502 });
  }
}
