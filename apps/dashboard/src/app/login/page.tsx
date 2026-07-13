"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useAuth } from "@/components/providers/auth-provider";
import GoogleIcon from "@/components/icons/GoogleIcon";
import { Button } from "@vippin/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@vippin/ui/card";
import { Loading } from "@vippin/ui/loading";
import { LayoutBackground } from "@vippin/ui/layout-background";

function isSafeNext(next: string | null): next is string {
  // Só aceita caminhos internos (evita open redirect).
  return Boolean(next && next.startsWith("/") && !next.startsWith("//"));
}

function LoginCard() {
  const { signInWithGoogle } = useAuth();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const next = isSafeNext(nextParam) ? nextParam : "/";

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle({ next });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao fazer login com Google"
      );
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <CardTitle className="text-3xl font-bold tracking-tight">
          Vippin Admin
        </CardTitle>
        <CardDescription className="font-medium">
          Acesso restrito à equipe. Entre com sua conta Google autorizada.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && (
          <p
            className="text-destructive text-center text-sm font-semibold"
            role="alert"
          >
            {error}
          </p>
        )}
        <Button
          variant="outline"
          size="lg"
          className="w-full gap-2"
          onClick={() => void handleGoogleSignIn()}
          disabled={loading}
        >
          {loading ? <Loading /> : <GoogleIcon />}
          {loading ? "Redirecionando..." : "Entrar com Google"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <LayoutBackground
      element="main"
      background="primary"
      className="flex min-h-svh items-center justify-center p-4"
    >
      <Suspense fallback={<Loading />}>
        <LoginCard />
      </Suspense>
    </LayoutBackground>
  );
}
