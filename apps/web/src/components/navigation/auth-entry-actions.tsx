"use client";

import { Compass, Menu, Rocket } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { LoginRolePicker } from "@/components/auth/login-role-picker";
import { Button } from "@vippin/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@vippin/ui/dialog";
import { useCurrentReturnPath } from "@/hooks/use-current-return-path";
import { buildLoginUrl } from "@/lib/auth/login-url";
import { cn } from "@vippin/ui/lib/utils";

interface AuthEntryActionsProps {
  className?: string;
}

/** Login / explore actions for visitors (responsive: menu on mobile, buttons on desktop). */
export function AuthEntryActions({ className }: AuthEntryActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const returnPath = useCurrentReturnPath();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="hidden items-center gap-2 sm:flex">
        <Button asChild variant="outline" size="sm">
          <Link href={buildLoginUrl({ role: "consumer", next: returnPath })}>
            Entrar como usuário
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link href={buildLoginUrl({ role: "creator", next: returnPath })}>
            <Rocket className="size-4" />
            Sou criador
          </Link>
        </Button>
      </div>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="sm:hidden"
            aria-label="Abrir menu de entrada"
          >
            <Menu className="size-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="gap-5">
          <DialogHeader>
            <DialogTitle>Entrar no Vippin</DialogTitle>
            <DialogDescription>
              Escolha como quer usar a plataforma.
            </DialogDescription>
          </DialogHeader>
          <LoginRolePicker next={returnPath} />
          <Button asChild variant="outline" className="w-full">
            <Link href="/explore" onClick={() => setMenuOpen(false)}>
              <Compass className="size-4" />
              Explorar conteúdos
            </Link>
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
