import { LayoutBackground } from "@vippin/ui/layout-background";
import { PageShell } from "@vippin/ui/page-shell";
import { cn } from "@vippin/ui/lib/utils";

/**
 * Esqueleto mostrado pelo `loading.tsx` enquanto o servidor responde: o clique
 * tem resposta visual na hora, em vez de a tela ficar parada. Só formas
 * estáticas com um pulso de opacidade (barato) que dura até a página chegar.
 */

function Block({ className }: { className?: string }) {
  return <div aria-hidden className={cn("bg-muted animate-pulse rounded-2xl", className)} />;
}

export function PageSkeleton({ variant }: { variant: "storefront" | "product" | "simple" }) {
  return (
    <LayoutBackground element="main" className="flex min-h-svh flex-col">
      <div className="h-16" aria-hidden />
      <PageShell>
        <span className="sr-only" role="status">
          Carregando...
        </span>

        {variant === "storefront" && (
          <>
            <div className="flex flex-col gap-5">
              <Block className="size-24 rounded-full" />
              <Block className="h-12 w-72 max-w-full" />
              <Block className="h-5 w-[min(32rem,100%)]" />
            </div>
            <div className="grid grid-cols-1 gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex flex-col gap-4">
                  <Block className="aspect-[4/3] w-full rounded-3xl" />
                  <Block className="h-5 w-3/4" />
                  <Block className="h-4 w-1/3" />
                </div>
              ))}
            </div>
          </>
        )}

        {variant === "product" && (
          <div className="flex flex-wrap items-start gap-12 lg:gap-16">
            <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-8">
              <Block className="aspect-video w-full rounded-[28px]" />
              <Block className="h-12 w-3/4" />
              <Block className="h-5 w-full" />
              <Block className="h-5 w-5/6" />
            </div>
            <Block className="h-72 w-full flex-[1_1_320px] rounded-3xl lg:max-w-[400px]" />
          </div>
        )}

        {variant === "simple" && (
          <div className="flex flex-col gap-6">
            <Block className="h-12 w-72 max-w-full" />
            <Block className="h-5 w-[min(28rem,100%)]" />
            <Block className="h-64 w-full rounded-3xl" />
          </div>
        )}
      </PageShell>
    </LayoutBackground>
  );
}
