"use client";

import { Banknote, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@vippin/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@vippin/ui/card";
import { formatBRL } from "@vippin/core/domain/money";
import {
  ABACATEPAY_PIX_SEND_FEE_CENTS,
  creatorWithdrawBalanceDescription,
  creatorWithdrawFeeDetails,
} from "@/lib/payments/platform-fee";

interface PayoutBalance {
  accruedCents: number;
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
      await loadBalance();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível sacar.";
      setError(message);
    } finally {
      setWithdrawing(false);
    }
  }

  const minWithdrawalLabel = formatBRL(balance?.minWithdrawalCents ?? 2000);

  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Banknote className="size-5" />
          Saldo para saque
        </CardTitle>
        <CardDescription>
          {creatorWithdrawBalanceDescription()} Mínimo de {minWithdrawalLabel} para sacar.
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
            {balance.accruedCents > balance.netCents && (
              <p className="text-muted-foreground text-sm">
                {formatBRL(balance.accruedCents)} acumulados −{" "}
                {formatBRL(ABACATEPAY_PIX_SEND_FEE_CENTS)} (taxa PIX do saque)
              </p>
            )}
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

        {balance && (
          <details className="text-muted-foreground group text-xs leading-relaxed">
            <summary className="cursor-pointer font-medium underline-offset-2 hover:underline">
              Como o saldo é calculado
            </summary>
            <p className="mt-2">
              {creatorWithdrawFeeDetails(balance.accruedCents, balance.netCents)}
            </p>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
