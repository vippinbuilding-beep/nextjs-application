import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/utils";

/**
 * - surface (padrão): fundo do card e sombra suave, sem borda. Para painéis e
 *   blocos de conteúdo; na maioria das telas o conteúdo fica solto na página
 *   (ver PageShell/Section) e o Card só agrupa o que precisa de moldura.
 * - outline: só borda (listas densas, formulários dentro de outra superfície).
 * - elevated: destaque que flutua (modais in-line, resumo fixo).
 */
const cardVariants = cva("bg-card text-card-foreground flex flex-col gap-6 rounded-3xl py-6", {
  variants: {
    variant: {
      surface: "shadow-surface",
      outline: "border border-border",
      elevated: "shadow-elevated-lg",
    },
  },
  defaultVariants: { variant: "surface" },
});

function Card({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return <div data-slot="card" className={cn(cardVariants({ variant }), className)} {...props} />;
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  );
}

/** `asChild` renders the title as its child, e.g. a real `<h1>`/`<h2>` (SEO). */
function CardTitle({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      data-slot="card-title"
      className={cn("leading-tight font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
