"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { UserAvatar } from "@/components/ui/user-avatar";
import { Loading } from "@/components/ui/loading";
import type { AskMeQuestionWithCreator } from "@/core/models/ask-me-question";
import {
  formatAskMeDeadline,
  getAskMeStatusLabel,
  isAskMeAwaitingResponse,
} from "@/lib/ask-me";
import { formatBRL } from "@/lib/money";
import { getAskMeAnswerVideoUrl } from "@/lib/supabase/storage";
import { askMeQuestionRepository } from "@/services/repository-factory";

interface AskMeConsumerInboxProps {
  askerId: string;
}

export function AskMeConsumerInbox({ askerId }: AskMeConsumerInboxProps) {
  const [questions, setQuestions] = useState<AskMeQuestionWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await askMeQuestionRepository.listByAsker(askerId);
      setQuestions(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar perguntas");
    } finally {
      setLoading(false);
    }
  }, [askerId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loading />
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive text-sm">{error}</p>;
  }

  if (questions.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        Você ainda não enviou perguntas.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {questions.map((q) => (
        <li
          key={q.id}
          className="rounded-xl border-2 border-border bg-background p-4 shadow-cartoon-sm"
        >
          <div className="mb-3 flex items-start gap-3">
            <UserAvatar
              userId={q.creator.id}
              name={q.creator.creatorName}
              avatarPath={q.creator.avatarPath}
              avatarUrl={q.creator.avatarUrl}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <Link
                href={`/@${q.creator.slug}`}
                className="font-bold hover:underline"
              >
                @{q.creator.creatorName}
              </Link>
              <p className="text-muted-foreground text-xs">
                {formatBRL(q.amountCents)} · {getAskMeStatusLabel(q.status)}
              </p>
            </div>
          </div>

          <p className="mb-2 text-xs font-bold">Sua pergunta</p>
          <p className="mb-3 whitespace-pre-wrap text-sm">{q.questionText}</p>

          {q.responseDeadlineAt && isAskMeAwaitingResponse(q.status) && (
            <p className="text-muted-foreground mb-3 text-xs">
              O criador tem até {formatAskMeDeadline(q.responseDeadlineAt)} para
              responder
            </p>
          )}

          {q.status === "answered" && (
            <div className="rounded-lg border-2 border-dashed border-border bg-primary/20 p-3">
              <p className="mb-1 text-xs font-bold">Resposta</p>
              {q.answerText && (
                <p className="whitespace-pre-wrap text-sm">{q.answerText}</p>
              )}
              {q.answerVideoPath && (
                <video
                  src={getAskMeAnswerVideoUrl(q.id)}
                  controls
                  className="mt-2 w-full rounded-xl border-2 border-border"
                />
              )}
            </div>
          )}

          {(q.status === "declined" || q.status === "expired") && (
            <p className="text-muted-foreground text-xs">
              O valor foi estornado automaticamente.
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
