"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { LoginRolePicker } from "@/components/auth/login-role-picker";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import GoogleIcon from "@/components/icons/GoogleIcon";
import { Loading } from "@/components/ui/loading";
import { LayoutBackground } from "@/components/ui/layout-background";
import { isAuthRole, buildLoginUrl } from "@/lib/auth/login-url";
import { LOGIN_ROLE_COPY } from "@/lib/auth/login-role-copy";

function LoginCard() {
  const { signInWithGoogle } = useAuth();
  const searchParams = useSearchParams();

  const roleParam = searchParams.get("role");
  const role = isAuthRole(roleParam) ? roleParam : null;
  const copy = role ? LOGIN_ROLE_COPY[role] : null;

  // Where to send the user back to after login (e.g. a product page they were
  // trying to buy). Only in-app paths are honored (see /auth/callback).
  const nextParam = searchParams.get("next");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle({
        next: nextParam ?? undefined,
        role: role ?? undefined,
      });
      // Browser redirects to Google — code below won't execute on success.
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
          <LoginRolePicker next={nextParam} />
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
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              {loading ? <Loading /> : <GoogleIcon />}
              {loading ? "Redirecionando..." : "Entrar com Google"}
            </Button>
            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link href={buildLoginUrl({ next: nextParam })}>
                Escolher outro perfil
              </Link>
            </Button>
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
