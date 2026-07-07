import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AskMeQuestion,
  AskMeQuestionStatus,
  AskMeQuestionWithAsker,
  AskMeQuestionWithCreator,
  AskMeTransferStatus,
} from "@/core/models/ask-me-question";
import type {
  AskMeQuestionRepository,
  CreateAskMeQuestionInput,
  UpdateAskMeQuestionInput,
} from "@/core/repositories/ask-me-repository";
import { ASK_ME_LIMITS } from "@/lib/ask-me";

const TABLE = "ask_me_questions";

type AskMeRow = {
  id: string;
  creator_id: string;
  asker_id: string;
  question_text: string;
  answer_text: string | null;
  answer_video_path: string | null;
  answer_video_mime: string | null;
  amount_cents: number;
  platform_fee_cents: number;
  creator_amount_cents: number;
  status: string;
  abacate_charge_id: string | null;
  br_code: string | null;
  br_code_base64: string | null;
  charge_expires_at: string | null;
  paid_at: string | null;
  response_deadline_at: string | null;
  answered_at: string | null;
  declined_at: string | null;
  refunded_at: string | null;
  refund_pix_key: string | null;
  refund_pix_key_type: string | null;
  transfer_status: string;
  abacate_transfer_id: string | null;
  transfer_error: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ProfilePreviewRow = {
  id: string;
  name: string | null;
  consumer_name: string | null;
  creator_name: string | null;
  slug: string | null;
  avatar_path: string | null;
  avatar_url: string | null;
};

export class SupabaseAskMeQuestionRepository implements AskMeQuestionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getById(id: string): Promise<AskMeQuestion | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return toQuestion(data as AskMeRow);
  }

  async listByCreator(creatorId: string): Promise<AskMeQuestionWithAsker[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("creator_id", creatorId)
      .neq("status", "pending_payment")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const rows = (data as AskMeRow[]) ?? [];
    const askerIds = [...new Set(rows.map((row) => row.asker_id))];
    const askers = await this.loadProfiles(askerIds);

    return rows.map((row) => ({
      ...toQuestion(row),
      asker: toAskerPreview(askers.get(row.asker_id)),
    }));
  }

  async listByAsker(askerId: string): Promise<AskMeQuestionWithCreator[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("asker_id", askerId)
      .neq("status", "pending_payment")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const rows = (data as AskMeRow[]) ?? [];
    const creatorIds = [...new Set(rows.map((row) => row.creator_id))];
    const creators = await this.loadProfiles(creatorIds);

    return rows.map((row) => ({
      ...toQuestion(row),
      creator: toCreatorPreview(creators.get(row.creator_id)),
    }));
  }

  async countAwaitingResponseByCreator(creatorId: string): Promise<number> {
    const { count, error } = await this.client
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .eq("creator_id", creatorId)
      .eq("status", "awaiting_response");

    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  async create(input: CreateAskMeQuestionInput): Promise<AskMeQuestion> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert({
        creator_id: input.creatorId,
        asker_id: input.askerId,
        question_text: input.questionText.trim(),
        amount_cents: input.amountCents,
        platform_fee_cents: input.platformFeeCents,
        creator_amount_cents: input.creatorAmountCents,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toQuestion(data as AskMeRow);
  }

  async update(
    id: string,
    patch: UpdateAskMeQuestionInput
  ): Promise<AskMeQuestion | null> {
    const row = toRow(patch);
    const { data, error } = await this.client
      .from(TABLE)
      .update(row)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return toQuestion(data as AskMeRow);
  }

  async transitionToAwaitingResponse(id: string): Promise<AskMeQuestion | null> {
    const paidAt = new Date();
    const responseDeadlineAt = new Date(
      paidAt.getTime() + ASK_ME_LIMITS.responseDeadlineHours * 60 * 60 * 1000
    );

    const { data, error } = await this.client
      .from(TABLE)
      .update({
        status: "awaiting_response",
        paid_at: paidAt.toISOString(),
        response_deadline_at: responseDeadlineAt.toISOString(),
        transfer_status: "held",
      })
      .eq("id", id)
      .eq("status", "pending_payment")
      .select("*")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;
    return toQuestion(data as AskMeRow);
  }

  async listExpiredAwaitingResponse(): Promise<AskMeQuestion[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("status", "awaiting_response")
      .lt("response_deadline_at", new Date().toISOString());
    if (error) throw new Error(error.message);
    return ((data as AskMeRow[]) ?? []).map(toQuestion);
  }

  async listPendingCreatorRepasses(limit: number): Promise<AskMeQuestion[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("status", "answered")
      .in("transfer_status", ["pending", "failed"])
      .order("answered_at", { ascending: true })
      .limit(limit);
    if (error) throw new Error(error.message);
    return ((data as AskMeRow[]) ?? []).map(toQuestion);
  }

  async listPendingCreatorRepassesByCreator(
    creatorId: string
  ): Promise<AskMeQuestion[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("creator_id", creatorId)
      .eq("status", "answered")
      .in("transfer_status", ["pending", "failed"])
      .order("answered_at", { ascending: true });
    if (error) throw new Error(error.message);
    return ((data as AskMeRow[]) ?? []).map(toQuestion);
  }

  async listFailedRefunds(
    limit: number,
    minAgeMs: number
  ): Promise<AskMeQuestion[]> {
    const cutoff = new Date(Date.now() - minAgeMs).toISOString();
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("status", "awaiting_response")
      .eq("transfer_status", "failed")
      .lt("updated_at", cutoff)
      .order("updated_at", { ascending: true })
      .limit(limit);
    if (error) throw new Error(error.message);
    return ((data as AskMeRow[]) ?? []).map(toQuestion);
  }

  async listFailedCreatorRepasses(
    limit: number,
    minAgeMs: number
  ): Promise<AskMeQuestion[]> {
    const cutoff = new Date(Date.now() - minAgeMs).toISOString();
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("status", "answered")
      .eq("transfer_status", "failed")
      .lt("updated_at", cutoff)
      .order("updated_at", { ascending: true })
      .limit(limit);
    if (error) throw new Error(error.message);
    return ((data as AskMeRow[]) ?? []).map(toQuestion);
  }

  private async loadProfiles(
    ids: string[]
  ): Promise<Map<string, ProfilePreviewRow>> {
    if (ids.length === 0) return new Map();

    const { data, error } = await this.client
      .from("public_profile_previews")
      .select("id, name, consumer_name, creator_name, slug, avatar_path, avatar_url")
      .in("id", ids);
    if (error) throw new Error(error.message);

    return new Map(
      ((data as ProfilePreviewRow[]) ?? []).map((row) => [row.id, row])
    );
  }
}

function toRow(patch: UpdateAskMeQuestionInput): Partial<AskMeRow> {
  const row: Partial<AskMeRow> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.answerText !== undefined) row.answer_text = patch.answerText;
  if (patch.answerVideoPath !== undefined)
    row.answer_video_path = patch.answerVideoPath;
  if (patch.answerVideoMime !== undefined)
    row.answer_video_mime = patch.answerVideoMime;
  if (patch.abacateChargeId !== undefined)
    row.abacate_charge_id = patch.abacateChargeId;
  if (patch.brCode !== undefined) row.br_code = patch.brCode;
  if (patch.brCodeBase64 !== undefined) row.br_code_base64 = patch.brCodeBase64;
  if (patch.chargeExpiresAt !== undefined) {
    row.charge_expires_at = patch.chargeExpiresAt
      ? patch.chargeExpiresAt.toISOString()
      : null;
  }
  if (patch.paidAt !== undefined) {
    row.paid_at = patch.paidAt ? patch.paidAt.toISOString() : null;
  }
  if (patch.responseDeadlineAt !== undefined) {
    row.response_deadline_at = patch.responseDeadlineAt
      ? patch.responseDeadlineAt.toISOString()
      : null;
  }
  if (patch.answeredAt !== undefined) {
    row.answered_at = patch.answeredAt ? patch.answeredAt.toISOString() : null;
  }
  if (patch.declinedAt !== undefined) {
    row.declined_at = patch.declinedAt ? patch.declinedAt.toISOString() : null;
  }
  if (patch.refundedAt !== undefined) {
    row.refunded_at = patch.refundedAt ? patch.refundedAt.toISOString() : null;
  }
  if (patch.transferStatus !== undefined)
    row.transfer_status = patch.transferStatus;
  if (patch.abacateTransferId !== undefined)
    row.abacate_transfer_id = patch.abacateTransferId;
  if (patch.transferError !== undefined) row.transfer_error = patch.transferError;
  return row;
}

function toQuestion(row: AskMeRow): AskMeQuestion {
  return {
    id: row.id,
    creatorId: row.creator_id,
    askerId: row.asker_id,
    questionText: row.question_text,
    answerText: row.answer_text ?? undefined,
    answerVideoPath: row.answer_video_path ?? undefined,
    answerVideoMime: row.answer_video_mime ?? undefined,
    amountCents: row.amount_cents,
    platformFeeCents: row.platform_fee_cents,
    creatorAmountCents: row.creator_amount_cents,
    status: row.status as AskMeQuestionStatus,
    abacateChargeId: row.abacate_charge_id ?? undefined,
    chargeExpiresAt: row.charge_expires_at
      ? new Date(row.charge_expires_at)
      : undefined,
    paidAt: row.paid_at ? new Date(row.paid_at) : undefined,
    responseDeadlineAt: row.response_deadline_at
      ? new Date(row.response_deadline_at)
      : undefined,
    answeredAt: row.answered_at ? new Date(row.answered_at) : undefined,
    declinedAt: row.declined_at ? new Date(row.declined_at) : undefined,
    refundedAt: row.refunded_at ? new Date(row.refunded_at) : undefined,
    transferStatus: row.transfer_status as AskMeTransferStatus,
    abacateTransferId: row.abacate_transfer_id ?? undefined,
    transferError: row.transfer_error ?? undefined,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
}

function toAskerPreview(row: ProfilePreviewRow | undefined) {
  return {
    id: row?.id ?? "",
    name: row?.consumer_name ?? row?.name ?? "Usuário",
    avatarPath: row?.avatar_path ?? undefined,
    avatarUrl: row?.avatar_url ?? undefined,
  };
}

function toCreatorPreview(row: ProfilePreviewRow | undefined) {
  return {
    id: row?.id ?? "",
    creatorName: row?.creator_name ?? row?.name ?? "Criador",
    slug: row?.slug ?? "",
    avatarPath: row?.avatar_path ?? undefined,
    avatarUrl: row?.avatar_url ?? undefined,
  };
}

export type AskMeRowWithRefund = AskMeQuestion & {
  refundPixKey?: string;
  refundPixKeyType?: string;
};

export async function getAskMeWithRefund(
  client: SupabaseClient,
  id: string
): Promise<AskMeRowWithRefund | null> {
  const { data, error } = await client
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as AskMeRow;
  return {
    ...toQuestion(row),
    refundPixKey: row.refund_pix_key ?? undefined,
    refundPixKeyType: row.refund_pix_key_type ?? undefined,
  };
}
