"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { LoginRolePicker } from "@/components/auth/login-role-picker";
import { BackButton } from "@/components/navigation/back-button";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@vippin/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@vippin/ui/card";
import GoogleIcon from "@/components/icons/GoogleIcon";
import { Loading } from "@vippin/ui/loading";
import { LayoutBackground } from "@vippin/ui/layout-background";
import {
  persistLoginReturnPath,
  readReferrerReturnPath,
  resolveLoginReturnPath,
  safeReturnPath,
} from "@/lib/auth/login-return";
import { isAuthRole, buildLoginUrl } from "@/lib/auth/login-url";
import { LOGIN_ROLE_COPY } from "@/lib/auth/login-role-copy";

function LoginCard() {
  const { signInWithGoogle } = useAuth();
  const searchParams = useSearchParams();

  const roleParam = searchParams.get("role");
  const role = isAuthRole(roleParam) ? roleParam : null;
  const copy = role ? LOGIN_ROLE_COPY[role] : null;

  const nextParam = searchParams.get("next");
  const [returnPath, setReturnPath] = useState(() =>
    resolveLoginReturnPath(nextParam)
  );

  useEffect(() => {
    const explicit = safeReturnPath(nextParam);
    if (explicit) {
      persistLoginReturnPath(explicit);
      setReturnPath(explicit);
      return;
    }

    const fromReferrer = readReferrerReturnPath();
    if (fromReferrer) {
      persistLoginReturnPath(fromReferrer);
      setReturnPath(fromReferrer);
    }
  }, [nextParam]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    try {
      persistLoginReturnPath(returnPath);
      await signInWithGoogle({
        next: returnPath,
        role: role ?? undefined,
      });
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
        <CardTitle className="text-4xl font-bold tracking-tight">Vippin</CardTitle>
        <CardDescription className="font-medium">
          {role
            ? copy?.description
            : "Como você quer entrar? Escolha seu perfil para continuar."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!role ? (
          <>
            <LoginRolePicker next={returnPath} />
            <BackButton href="/" variant="ghost" className="w-full" label="Voltar ao início" />
          </>
        ) : (
          <>
            {error && (
              <p
                className="text-destructive text-sm text-center font-semibold"
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
            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link href={buildLoginUrl({ next: returnPath })}>
                Escolher outro perfil
              </Link>
            </Button>
            <BackButton href="/" variant="ghost" className="w-full" label="Voltar ao início" />
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <LayoutBackground element="main" background="primary" className="flex items-center justify-center p-4">
      <Suspense fallback={<Loading />}>
        <LoginCard />
      </Suspense>
    </LayoutBackground>
  );
}
