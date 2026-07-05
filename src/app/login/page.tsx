"use client";

import { Heart, Rocket } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

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

const ROLE_COPY = {
  creator: {
    icon: Rocket,
    badge: "Perfil de criador",
    description:
      "Entre com o Google para montar sua vitrine, publicar aulas e começar a vender.",
  },
  consumer: {
    icon: Heart,
    badge: "Perfil de consumidor",
    description:
      "Entre com o Google para acessar aulas e materiais dos criadores que você admira.",
  },
} as const;

type Role = keyof typeof ROLE_COPY;

function LoginCard() {
  const { signInWithGoogle } = useAuth();
  const searchParams = useSearchParams();

  const roleParam = searchParams.get("role");
  const role: Role | null =
    roleParam === "creator" || roleParam === "consumer" ? roleParam : null;
  const copy = role ? ROLE_COPY[role] : null;

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
          {copy?.description ?? "Entre com sua conta Google para continuar"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && (
          <p className="text-destructive text-sm text-center font-semibold" role="alert">
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
