"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@vippin/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@vippin/ui/card";
import { LayoutBackground } from "@vippin/ui/layout-background";

export default function AcessoNegadoPage() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      await signOut();
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LayoutBackground
      element="main"
      className="flex min-h-svh items-center justify-center p-4"
    >
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Acesso negado
          </CardTitle>
          <CardDescription className="font-medium">
            Sua conta não tem permissão para acessar o painel administrativo.
            Fale com a equipe se acredita que isso é um engano.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => void handleSignOut()}
            disabled={loading}
          >
            {loading ? "Saindo..." : "Sair e trocar de conta"}
          </Button>
        </CardContent>
      </Card>
    </LayoutBackground>
  );
}
