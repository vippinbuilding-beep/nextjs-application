import * as React from "react";

import { cn } from "../lib/utils";

/**
 * Layout aberto do Espectro 2: o conteúdo fica solto sobre o fundo, separado
 * por espaço (não por caixas). Use dentro de `LayoutBackground`:
 *
 *   <LayoutBackground>
 *     <PageShell>
 *       <PageHeader title="Produtos" description="..." actions={<Button />} />
 *       <Section title="Publicados">...</Section>
 *     </PageShell>
 *   </LayoutBackground>
 */

const SHELL_WIDTHS = {
  /** Leitura e formulários curtos. */
  narrow: "max-w-3xl",
  /** Formulários com seções (FormSection). */
  form: "max-w-4xl",
  /** Padrão: vitrines, listas, painel. */
  default: "max-w-6xl",
  /** Tabelas e painéis densos. */
  wide: "max-w-7xl",
} as const;

interface PageShellProps extends React.ComponentProps<"div"> {
  width?: keyof typeof SHELL_WIDTHS;
}

function PageShell({ width = "default", className, ...props }: PageShellProps) {
  return (
    <div
      data-slot="page-shell"
      className={cn(
        "mx-auto flex w-full flex-col gap-16 px-5 py-10 sm:gap-20 sm:px-8 sm:py-14 lg:px-10",
        SHELL_WIDTHS[width],
        className
      )}
      {...props}
    />
  );
}

interface PageHeaderProps extends Omit<React.ComponentProps<"header">, "title"> {
  title: React.ReactNode;
  /** Linha curta logo abaixo do título (ex.: @handle). */
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  /** Ações à direita (no celular, abaixo do título). */
  actions?: React.ReactNode;
  /** Algo antes do título, ex.: avatar do criador. */
  leading?: React.ReactNode;
  /** Brilho da aurora atrás do cabeçalho (vitrine, produto). Um por tela. */
  glow?: boolean;
}

/**
 * Título da página (h1). Sem animação de entrada: o título costuma ser o maior
 * elemento da tela (LCP) e aparece pronto do servidor; esconder e animar
 * atrasa a pintura e briga com a hidratação em aparelho fraco.
 */
function PageHeader({ title, subtitle, description, actions, leading, glow, className, ...props }: PageHeaderProps) {
  return (
    <header
      data-slot="page-header"
      className={cn("relative flex flex-wrap items-end gap-x-10 gap-y-6", className)}
      {...props}
    >
      {glow && <div aria-hidden className="aurora-glow pointer-events-none absolute -inset-x-10 -inset-y-16 -z-10" />}
      <div className="flex min-w-0 flex-1 basis-80 flex-col gap-5">
        {leading}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-balance sm:text-5xl">{title}</h1>
            {subtitle && <div className="text-muted-foreground text-base">{subtitle}</div>}
          </div>
          {description && (
            <div className="text-muted-foreground max-w-[60ch] text-lg leading-relaxed">{description}</div>
          )}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

interface SectionProps extends Omit<React.ComponentProps<"section">, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Ação no canto do título (ex.: "Ver todos"). */
  action?: React.ReactNode;
}

/** Bloco da página com título (h2). Sem moldura: o espaço é o separador. */
function Section({ title, description, action, className, children, ...props }: SectionProps) {
  return (
    <section data-slot="section" className={cn("flex flex-col gap-6", className)} {...props}>
      {(title || action) && (
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div className="flex flex-col gap-1.5">
            {title && <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>}
            {description && <p className="text-muted-foreground max-w-[60ch]">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

interface FormSectionProps extends Omit<React.ComponentProps<"section">, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
}

/**
 * Grupo de campos de um formulário: em telas largas, título e explicação à
 * esquerda e campos à direita; no celular, empilhado. Seções seguidas se
 * separam por uma linha fina. Use dentro de um `Card` (o formulário é o
 * único bloco que leva moldura).
 */
function FormSection({ title, description, className, children, ...props }: FormSectionProps) {
  return (
    <section
      data-slot="form-section"
      className={cn(
        "grid gap-x-10 gap-y-5 py-8 first:pt-2 last:pb-2 [&+&]:border-t [&+&]:border-border lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]",
        className
      )}
      {...props}
    >
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold leading-tight">{title}</h2>
        {description && <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  );
}

export { PageShell, PageHeader, Section, FormSection };
