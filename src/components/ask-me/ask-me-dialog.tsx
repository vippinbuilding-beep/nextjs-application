"use client";

import { Check, Copy, MessageCircleQuestion, QrCode } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loading } from "@/components/ui/loading";
import { Textarea } from "@/components/ui/textarea";
import {
  ASK_ME_LIMITS,
  validateAskMeQuestion,
  validateRefundPixKey,
} from "@/lib/ask-me";
import { formatBRL } from "@/lib/money";

interface AskMeDialogProps {
  creatorId: string;
  creatorName: string;
  priceCents: number;
  isAuthenticated: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CheckoutResponse {
  questionId: string;
  amountCents: number;
  brCode: string;
  brCodeBase64: string;
  expiresAt: string | null;
  responseDeadlineHours?: number;
  error?: string;
}

type Phase = "form" | "creating" | "awaiting" | "paid" | "error";

const POLL_INTERVAL_MS = 4000;

export function AskMeDialog({
  creatorId,
  creatorName,
  priceCents,
  isAuthenticated,
  open,
  onOpenChange,
}: AskMeDialogProps) {
  const pathname = usePathname();
  const [questionText, setQuestionText] = useState("");
  const [refundPixKey, setRefundPixKey] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [checkout, setCheckout] = useState<CheckoutResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  useEffect(() => {
    if (!open) {
      setPhase("form");
      setCheckout(null);
      setError(null);
      setQuestionText("");
      setRefundPixKey("");
      stopPolling();
    }
  }, [open, stopPolling]);

  useEffect(() => {
    if (phase !== "awaiting" || !checkout) return;

    async function poll() {
      try {
        const res = await fetch(`/api/ask-me/questions/${checkout!.questionId}/status`);
        if (!res.ok) return;
        const body = (await res.json()) as { status: string };
        if (body.status === "awaiting_response") {
          stopPolling();
          setPhase("paid");
        } else if (body.status === "payment_expired") {
          stopPolling();
          setError("O tempo para pagamento expirou. Tente novamente.");
          setPhase("error");
        }
      } catch {
        // keep polling
      }
    }

    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return stopPolling;
  }, [phase, checkout, stopPolling]);

  async function handleSubmit() {
    setError(null);
    const validationError = validateAskMeQuestion(questionText);
    if (validationError) {
      setError(validationError);
      return;
    }

    const pixError = validateRefundPixKey(refundPixKey);
    if (pixError) {
      setError(pixError);
      return;
    }

    setPhase("creating");
    try {
      const res = await fetch(`/api/ask-me/${creatorId}/checkout`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionText, refundPixKey }),
      });
      const body = (await res.json()) as CheckoutResponse;
      if (!res.ok) {
        throw new Error(body.error ?? "Não foi possível iniciar o pagamento.");
      }
      setCheckout(body);
      setPhase("awaiting");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar pergunta.");
      setPhase("error");
    }
  }

  async function copyCode() {
    if (!checkout) return;
    try {
      await navigator.clipboard.writeText(checkout.brCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  if (!isAuthenticated) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Me pergunte</DialogTitle>
            <DialogDescription>
              Entre na sua conta para enviar uma pergunta paga a @{creatorName}.
            </DialogDescription>
          </DialogHeader>
          <Button asChild className="w-full">
            <Link href={`/login?next=${encodeURIComponent(pathname)}`}>
              Entrar para perguntar
            </Link>
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {phase === "paid" ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl border-2 border-border bg-primary shadow-cartoon-sm">
              <Check className="size-6" />
            </span>
            <p className="font-bold">Pergunta enviada!</p>
            <p className="text-muted-foreground text-sm">
              O criador tem até {ASK_ME_LIMITS.responseDeadlineHours}h para responder.
              Acompanhe em Minhas perguntas.
            </p>
            <Button asChild className="w-full">
              <Link href="/my-questions">Ver minhas perguntas</Link>
            </Button>
          </div>
        ) : phase === "awaiting" && checkout ? (
          <div className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Pague com PIX</DialogTitle>
              <DialogDescription>
                Valor: {formatBRL(checkout.amountCents)} — o pagamento fica retido
                até a resposta.
              </DialogDescription>
            </DialogHeader>
            <AskMeQrPanel checkout={checkout} copied={copied} onCopy={copyCode} />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Me pergunte</DialogTitle>
              <DialogDescription>
                Envie uma pergunta para @{creatorName} por{" "}
                {formatBRL(priceCents)}. O valor só é liberado ao criador se ele
                responder em até {ASK_ME_LIMITS.responseDeadlineHours}h.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ask-me-refund-pix">
                Chave PIX para reembolso (se necessário)
              </Label>
              <Input
                id="ask-me-refund-pix"
                value={refundPixKey}
                onChange={(e) => setRefundPixKey(e.target.value)}
                placeholder="CPF, e-mail, telefone ou chave aleatória"
                autoComplete="off"
                disabled={phase === "creating"}
              />
              <p className="text-muted-foreground text-xs">
                Usada só se o criador não responder em até{" "}
                {ASK_ME_LIMITS.responseDeadlineHours}h.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ask-me-question">Sua pergunta</Label>
              <Textarea
                id="ask-me-question"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="O que você quer saber?"
                maxLength={ASK_ME_LIMITS.question.max}
                rows={4}
                disabled={phase === "creating"}
              />
            </div>

            {error && (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            )}

            <Button
              type="button"
              className="w-full"
              disabled={phase === "creating"}
              onClick={() => void handleSubmit()}
            >
              {phase === "creating" ? (
                <>
                  <Loading /> Gerando PIX...
                </>
              ) : (
                <>
                  <QrCode className="size-4" />
                  Pagar {formatBRL(priceCents)} e enviar
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AskMeQrPanel({
  checkout,
  copied,
  onCopy,
}: {
  checkout: CheckoutResponse;
  copied: boolean;
  onCopy: () => void;
}) {
  const imgSrc = checkout.brCodeBase64.startsWith("data:")
    ? checkout.brCodeBase64
    : `data:image/png;base64,${checkout.brCodeBase64}`;

  return (
    <div className="flex w-full flex-col items-center gap-4 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt="QR Code PIX"
        className="mx-auto w-full max-w-56 rounded-xl border-2 border-border bg-white p-2"
      />
      <div className="flex w-full min-w-0 flex-col gap-2">
        <p className="text-muted-foreground text-xs font-medium">
          Ou copie o código PIX:
        </p>
        <div className="flex w-full min-w-0 items-start gap-2">
          <code className="min-w-0 flex-1 break-all rounded-xl border-2 border-border bg-muted px-3 py-2 text-left text-[10px] leading-snug sm:text-xs">
            {checkout.brCode}
          </code>
          <Button type="button" variant="outline" size="icon" onClick={onCopy}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loading /> Aguardando confirmação do pagamento...
      </p>
    </div>
  );
}

interface AskMeProfileButtonProps {
  creatorId: string;
  creatorName: string;
  priceCents: number;
  isAuthenticated: boolean;
  isOwner: boolean;
}

export function AskMeProfileButton({
  creatorId,
  creatorName,
  priceCents,
  isAuthenticated,
  isOwner,
}: AskMeProfileButtonProps) {
  const [open, setOpen] = useState(false);

  if (isOwner) {
    return (
      <Button size="sm" variant="outline" asChild>
        <Link href="/profile/ask-me">
          <MessageCircleQuestion className="size-4" />
          Me pergunte
        </Link>
      </Button>
    );
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <MessageCircleQuestion className="size-4" />
        Me pergunte · {formatBRL(priceCents)}
      </Button>
      <AskMeDialog
        creatorId={creatorId}
        creatorName={creatorName}
        priceCents={priceCents}
        isAuthenticated={isAuthenticated}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
