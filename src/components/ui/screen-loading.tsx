import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { LayoutBackground } from "@/components/ui/layout-background";
import { TypeBackground } from "./layout-background/types";

interface ScreenLoadingProps {
  /** Título principal exibido abaixo do indicador. */
  title?: string;
  /** Texto secundário, opcional. */
  description?: string;
  /** Cor de fundo da tela (segue o LayoutBackground). */
  background?: TypeBackground;
  className?: string;
}

/**
 * Loading em tela cheia, no estilo "cartoon" do app.
 *
 * Use para estados de carregamento de página inteira (ex.: enquanto a sessão
 * carrega ou uma rota é resolvida). Para um spinner inline pequeno, use o
 * componente {@link Loading}.
 */
export function ScreenLoading({
  title = "Carregando...",
  description,
  background = "primary",
  className,
}: ScreenLoadingProps) {
  return (
    <LayoutBackground
      element="main"
      background={background}
      className={cn("flex items-center justify-center p-4", className)}
    >
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="relative flex size-20 items-center justify-center rounded-2xl border-2 border-border bg-background shadow-cartoon-lg">
          <span className="absolute inset-0 animate-ping rounded-2xl border-2 border-border opacity-20" />
          <Loader2 className="size-9 animate-spin" strokeWidth={2.5} />
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-xl font-bold tracking-tight">{title}</p>
          {description && (
            <p className="text-muted-foreground max-w-64 text-sm font-medium">
              {description}
            </p>
          )}
        </div>

        <span className="sr-only" role="status">
          {title}
        </span>
      </div>
    </LayoutBackground>
  );
}
