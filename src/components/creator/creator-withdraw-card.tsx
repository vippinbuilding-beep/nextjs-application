"use client";

import { Banknote, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBRL } from "@/lib/money";
import { toast } from "@/lib/toast";

interface PayoutBalance {
  netCents: number;
  orderCount: number;
  askMeCount: number;
  minWithdrawalCents: number;
  canWithdraw: boolean;
  hasPixKey: boolean;
}

export function CreatorWithdrawCard() {
  const [balance, setBalance] = useState<PayoutBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBalance = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/creator/payout-balance");
      const body = (await res.json()) as PayoutBalance & { error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? "Não foi possível carregar o saldo.");
      }
      setBalance(body);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível carregar o saldo."
      );
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBalance();
  }, [loadBalance]);

  async function handleWithdraw() {
    if (!balance?.canWithdraw) return;
    setWithdrawing(true);
    setError(null);
    try {
      const res = await fetch("/api/creator/withdraw", { method: "POST" });
      const body = (await res.json()) as { error?: string; netCents?: number };
      if (!res.ok) {
        throw new Error(body.error ?? "Não foi possível sacar.");
      }
      toast.success(
        body.netCents
          ? `Saque de ${formatBRL(body.netCents)} enviado para sua chave PIX.`
          : "Saque enviado para sua chave PIX."
      );
      await loadBalance();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível sacar.";
      setError(message);
      toast.error(message);
    } finally {
      setWithdrawing(false);
    }
  }

  const minLabel = formatBRL(balance?.minWithdrawalCents ?? 0);

  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Banknote className="size-5" />
          Saldo para saque
        </CardTitle>
        <CardDescription>
          Acumule vendas e Me pergunte respondidos. Saque manual com mínimo de{" "}
          {minLabel}.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {loading ? (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Carregando saldo...
          </p>
        ) : balance ? (
          <>
            <p className="text-3xl font-bold tracking-tight">
              {formatBRL(balance.netCents)}
            </p>
            {(balance.orderCount > 0 || balance.askMeCount > 0) && (
              <p className="text-muted-foreground text-sm">
                {balance.orderCount > 0 &&
                  `${balance.orderCount} venda${balance.orderCount === 1 ? "" : "s"}`}
                {balance.orderCount > 0 && balance.askMeCount > 0 && " · "}
                {balance.askMeCount > 0 &&
                  `${balance.askMeCount} Me pergunte`}
              </p>
            )}
            {!balance.hasPixKey && (
              <p className="text-sm font-medium">
                <Link href="/profile/edit" className="underline">
                  Cadastre sua chave PIX
                </Link>{" "}
                para sacar.
              </p>
            )}
            {balance.hasPixKey &&
              balance.netCents > 0 &&
              balance.netCents < balance.minWithdrawalCents && (
                <p className="text-muted-foreground text-sm">
                  Faltam{" "}
                  {formatBRL(balance.minWithdrawalCents - balance.netCents)} para
                  atingir o mínimo de saque.
                </p>
              )}
          </>
        ) : null}

        {error && (
          <p className="text-destructive text-sm font-medium" role="alert">
            {error}
          </p>
        )}

        <Button
          type="button"
          className="w-full"
          disabled={loading || withdrawing || !balance?.canWithdraw}
          onClick={() => void handleWithdraw()}
        >
          {withdrawing ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Sacando...
            </>
          ) : (
            <>
              <Banknote className="size-4" />
              Sacar para PIX
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
