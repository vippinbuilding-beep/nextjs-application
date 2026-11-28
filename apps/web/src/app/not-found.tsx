import { Compass, Home } from "lucide-react";
import Link from "next/link";

import { Button } from "@vippin/ui/button";
import { LayoutBackground } from "@vippin/ui/layout-background";
import { PageShell } from "@vippin/ui/page-shell";
import { SiteLogo } from "@/components/ui/site-logo";

export default function NotFound() {
  return (
    <LayoutBackground element="main" background="primary" className="flex min-h-svh flex-col">
      <PageShell width="narrow" className="flex-1 justify-center">
        <div className="flex flex-col items-start gap-6">
          <SiteLogo size={40} nameClassName="text-xl" className="w-auto" />
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Página não encontrada</h1>
            <p className="text-muted-foreground text-lg">O endereço que você acessou não existe ou foi movido.</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="lg">
              <Link href="/">
                <Home className="size-5" />
                Ir para o início
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/explore">
                <Compass className="size-5" />
                Explorar produtos
              </Link>
            </Button>
          </div>
        </div>
      </PageShell>
    </LayoutBackground>
  );
}
