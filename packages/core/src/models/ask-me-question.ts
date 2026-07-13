export type AskMeQuestionStatus =
  | "pending_payment"
  | "awaiting_response"
  | "answered"
  | "declined"
  | "expired"
  | "payment_expired"
  | "failed";

export type AskMeTransferStatus =
  | "pending"
  | "held"
  | "sent"
  | "refunded"
  | "failed";

export interface AskMeQuestion {
  id: string;
  creatorId: string;
  askerId: string;
  questionText: string;
  answerText?: string;
  answerVideoPath?: string;
  answerVideoMime?: string;
  amountCents: number;
  platformFeeCents: number;
  creatorAmountCents: number;
  status: AskMeQuestionStatus;
  abacateChargeId?: string;
  chargeExpiresAt?: Date;
  paidAt?: Date;
  responseDeadlineAt?: Date;
  answeredAt?: Date;
  declinedAt?: Date;
  refundedAt?: Date;
  transferStatus: AskMeTransferStatus;
  abacateTransferId?: string;
  transferError?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Public-safe asker info for creator inbox. */
export interface AskMeAskerPreview {
  id: string;
  name: string;
  avatarPath?: string;
  avatarUrl?: string;
}

/** Public-safe creator info for consumer inbox. */
export interface AskMeCreatorPreview {
  id: string;
  creatorName: string;
  slug: string;
  avatarPath?: string;
  avatarUrl?: string;
}

export interface AskMeQuestionWithAsker extends AskMeQuestion {
  asker: AskMeAskerPreview;
}

export interface AskMeQuestionWithCreator extends AskMeQuestion {
  creator: AskMeCreatorPreview;
}
