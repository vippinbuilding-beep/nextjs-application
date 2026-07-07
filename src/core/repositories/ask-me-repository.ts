import type {
  AskMeQuestion,
  AskMeQuestionWithAsker,
  AskMeQuestionWithCreator,
} from "@/core/models/ask-me-question";

export interface CreateAskMeQuestionInput {
  creatorId: string;
  askerId: string;
  questionText: string;
  amountCents: number;
  platformFeeCents: number;
  creatorAmountCents: number;
}

export interface UpdateAskMeQuestionInput {
  status?: AskMeQuestion["status"];
  answerText?: string | null;
  answerVideoPath?: string | null;
  answerVideoMime?: string | null;
  abacateChargeId?: string | null;
  brCode?: string | null;
  brCodeBase64?: string | null;
  chargeExpiresAt?: Date | null;
  paidAt?: Date | null;
  responseDeadlineAt?: Date | null;
  answeredAt?: Date | null;
  declinedAt?: Date | null;
  refundedAt?: Date | null;
  transferStatus?: AskMeQuestion["transferStatus"];
  abacateTransferId?: string | null;
  transferError?: string | null;
}

export interface AskMeQuestionRepository {
  getById(id: string): Promise<AskMeQuestion | null>;
  listByCreator(creatorId: string): Promise<AskMeQuestionWithAsker[]>;
  listByAsker(askerId: string): Promise<AskMeQuestionWithCreator[]>;
  countAwaitingResponseByCreator(creatorId: string): Promise<number>;
  create(input: CreateAskMeQuestionInput): Promise<AskMeQuestion>;
  update(id: string, patch: UpdateAskMeQuestionInput): Promise<AskMeQuestion | null>;
  transitionToAwaitingResponse(id: string): Promise<AskMeQuestion | null>;
  /** Answered questions awaiting (or retrying) the weekly creator repass batch. */
  listPendingCreatorRepasses(limit: number): Promise<AskMeQuestion[]>;
  /** Answered questions awaiting repass for a single creator (manual withdraw). */
  listPendingCreatorRepassesByCreator(
    creatorId: string
  ): Promise<AskMeQuestion[]>;
  /** Awaiting questions whose refund failed and is eligible for retry. */
  listFailedRefunds(limit: number, minAgeMs: number): Promise<AskMeQuestion[]>;
  /** Answered questions whose creator repass previously failed. */
  listFailedCreatorRepasses(limit: number, minAgeMs: number): Promise<AskMeQuestion[]>;
}
