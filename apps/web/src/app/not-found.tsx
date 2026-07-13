import { Compass, Home } from "lucide-react";
import Link from "next/link";

import { Button } from "@vippin/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@vippin/ui/card";
import { LayoutBackground } from "@vippin/ui/layout-background";
import { SiteLogo } from "@/components/ui/site-logo";

export default function NotFound() {
  return (
    <LayoutBackground
      element="main"
      className="flex min-h-svh flex-col items-center justify-center p-4 py-10"
    >
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <SiteLogo size={48} nameClassName="text-2xl" />
          <CardTitle className="text-2xl">Página não encontrada</CardTitle>
          <CardDescription>
            O endereço que você acessou não existe ou foi movido.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/">
              <Home className="size-4" />
              Ir para o início
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/explore">
              <Compass className="size-4" />
              Explorar produtos
            </Link>
          </Button>
        </CardContent>
      </Card>
    </LayoutBackground>
  );
}
