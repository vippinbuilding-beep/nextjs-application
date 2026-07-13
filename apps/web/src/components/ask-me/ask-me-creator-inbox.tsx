"use client";

import { Film } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@vippin/ui/button";
import { FileUploadField } from "@/components/ui/file-upload-field";
import { Label } from "@vippin/ui/label";
import { Loading } from "@vippin/ui/loading";
import { Textarea } from "@vippin/ui/textarea";
import type { AskMeQuestionWithAsker } from "@vippin/core/models/ask-me-question";
import {
  ASK_ME_LIMITS,
  ASK_ME_VIDEO_ACCEPT,
  canCreatorRespondToAskMe,
  formatAskMeDeadline,
  getAskMeCreatorStatusLabel,
  validateAskMeAnswerText,
  validateAskMeVideo,
} from "@vippin/core/domain/ask-me";
import { refreshAskMePendingCount } from "@/lib/ask-me/pending-count";
import { formatBRL } from "@vippin/core/domain/money";
import { getAskMeAnswerVideoUrl, ASK_ME_ANSWERS_BUCKET } from "@/lib/supabase/storage";
import { supabase } from "@vippin/supabase/client/client";
import { askMeQuestionRepository } from "@vippin/supabase/factories/repository-factory";
import { toast, TOAST_MESSAGES } from "@/lib/toast";

export type AskMeCreatorInboxFilter = "all" | "unanswered";

interface AskMeCreatorInboxProps {
  creatorId: string;
  filter?: AskMeCreatorInboxFilter;
}

export function AskMeCreatorInbox({
  creatorId,
  filter = "all",
}: AskMeCreatorInboxProps) {
  const [questions, setQuestions] = useState<AskMeQuestionWithAsker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [videoFiles, setVideoFiles] = useState<Record<string, File | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await askMeQuestionRepository.listByCreator(creatorId);
      setQuestions(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar perguntas");
    } finally {
      setLoading(false);
    }
  }, [creatorId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function uploadVideo(questionId: string, file: File): Promise<string> {
    const res = await fetch(`/api/ask-me/questions/${questionId}/upload-url`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
        size: file.size,
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? "Falha no upload do vídeo");
    }
    const { path, token } = (await res.json()) as { path: string; token: string };
    const { error } = await supabase.storage
      .from(ASK_ME_ANSWERS_BUCKET)
      .uploadToSignedUrl(path, token, file, { contentType: file.type });
    if (error) throw new Error(error.message);
    return path;
  }

  async function handleAnswer(questionId: string) {
    const text = (answerDrafts[questionId] ?? "").trim();
    const videoFile = videoFiles[questionId];
    if (!text && !videoFile) {
      setError("Escreva uma resposta ou envie um vídeo.");
      return;
    }
    if (text) {
      const textError = validateAskMeAnswerText(text);
      if (textError) {
        setError(textError);
        return;
      }
    }
    if (videoFile) {
      const videoError = validateAskMeVideo(videoFile);
      if (videoError) {
        setError(videoError);
        return;
      }
    }

    setBusyId(questionId);
    setError(null);
    try {
      let answerVideoPath: string | undefined;
      let answerVideoMime: string | undefined;
      if (videoFile) {
        answerVideoPath = await uploadVideo(questionId, videoFile);
        answerVideoMime = videoFile.type;
      }

      const res = await fetch(`/api/ask-me/questions/${questionId}/answer`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          answerText: text || undefined,
          answerVideoPath,
          answerVideoMime,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Falha ao enviar resposta");
      }
      await load();
      refreshAskMePendingCount();
      toast.success(TOAST_MESSAGES.answerSent);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao responder";
      setError(message);
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDecline(questionId: string) {
    if (!confirm("Recusar esta pergunta? O valor será estornado ao perguntador.")) {
      return;
    }
    setBusyId(questionId);
    setError(null);
    try {
      const res = await fetch(`/api/ask-me/questions/${questionId}/answer`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Falha ao recusar");
      }
      await load();
      refreshAskMePendingCount();
      toast.success(TOAST_MESSAGES.declined);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao recusar";
      setError(message);
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loading />
      </div>
    );
  }

  const visibleQuestions =
    filter === "unanswered"
      ? questions.filter((q) =>
          canCreatorRespondToAskMe(q.status, q.responseDeadlineAt)
        )
      : questions;

  if (visibleQuestions.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        {filter === "unanswered"
          ? "Nenhuma pergunta aguardando resposta no momento."
          : "Nenhuma pergunta recebida ainda."}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {visibleQuestions.map((q) => (
        <li
          key={q.id}
          className="rounded-xl border-2 border-border bg-background p-4 shadow-cartoon-sm"
        >
          <div className="mb-3 flex items-start gap-3">
            <UserAvatar
              userId={q.asker.id}
              name={q.asker.name}
              avatarPath={q.asker.avatarPath}
              avatarUrl={q.asker.avatarUrl}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="font-bold">{q.asker.name}</p>
              <p className="text-muted-foreground text-xs">
                {formatBRL(q.amountCents)} ·{" "}
                {getAskMeCreatorStatusLabel(q.status, q.responseDeadlineAt)}
              </p>
            </div>
          </div>

          <p className="mb-3 whitespace-pre-wrap text-sm">{q.questionText}</p>

          {canCreatorRespondToAskMe(q.status, q.responseDeadlineAt) &&
            q.responseDeadlineAt && (
            <p className="text-muted-foreground mb-3 text-xs">
              Responder até {formatAskMeDeadline(q.responseDeadlineAt)}
            </p>
          )}

          {!canCreatorRespondToAskMe(q.status, q.responseDeadlineAt) &&
            q.status === "awaiting_response" && (
            <p className="text-muted-foreground mb-3 text-xs">
              Prazo esgotado. O estorno será processado em breve.
            </p>
          )}

          {q.answerText && (
            <div className="mb-3 rounded-lg border-2 border-dashed border-border bg-muted/40 p-3 text-sm">
              <p className="mb-1 text-xs font-bold">Sua resposta</p>
              <p className="whitespace-pre-wrap">{q.answerText}</p>
            </div>
          )}

          {q.answerVideoPath && (
            <video
              src={getAskMeAnswerVideoUrl(q.id)}
              controls
              className="mb-3 w-full rounded-xl border-2 border-border"
            />
          )}

          {canCreatorRespondToAskMe(q.status, q.responseDeadlineAt) && (
            <div className="flex flex-col gap-3 border-t-2 border-dashed border-border pt-3">
              <div className="flex flex-col gap-2">
                <Label>Responder em texto</Label>
                <Textarea
                  value={answerDrafts[q.id] ?? ""}
                  onChange={(e) =>
                    setAnswerDrafts((prev) => ({
                      ...prev,
                      [q.id]: e.target.value,
                    }))
                  }
                  maxLength={ASK_ME_LIMITS.answerText.max}
                  rows={3}
                  disabled={busyId === q.id}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`ask-me-video-${q.id}`}>Ou enviar vídeo</Label>
                <FileUploadField
                  id={`ask-me-video-${q.id}`}
                  accept={ASK_ME_VIDEO_ACCEPT}
                  file={videoFiles[q.id] ?? null}
                  onFileChange={(file) =>
                    setVideoFiles((prev) => ({ ...prev, [q.id]: file }))
                  }
                  validate={validateAskMeVideo}
                  disabled={busyId === q.id}
                  title="Escolher vídeo de resposta"
                  description="Clique ou arraste um MP4 aqui"
                  icon={Film}
                  hint="MP4 (H.264 recomendado)."
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={busyId === q.id}
                  onClick={() => void handleDecline(q.id)}
                >
                  {busyId === q.id ? (
                    <>
                      <Loading /> Enviando...
                    </>
                  ) : (
                    "Recusar e estornar"
                  )}
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={busyId === q.id}
                  onClick={() => void handleAnswer(q.id)}
                >
                  {busyId === q.id ? "Enviando..." : "Responder"}
                </Button>
              </div>
            </div>
          )}
        </li>
      ))}
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </ul>
  );
}
