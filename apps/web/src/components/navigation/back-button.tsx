"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button, type buttonVariants } from "@vippin/ui/button";
import { useCanGoBack } from "@/hooks/use-can-go-back";
import { useNavigateBack } from "@/hooks/use-navigate-back";
import { cn } from "@vippin/ui/lib/utils";
import type { VariantProps } from "class-variance-authority";

interface BackButtonProps
  extends Omit<React.ComponentProps<"button">, "onClick">,
    VariantProps<typeof buttonVariants> {
  /** Destination when there is no in-app history to go back to. */
  fallback?: string;
  /** Explicit link — skips history and always navigates here. */
  href?: string;
  label?: string;
  showIcon?: boolean;
  /** Hides the text label below `sm`; keep `aria-label` for accessibility. */
  responsiveLabel?: boolean;
  /** Hides the button when there is no in-app history to go back to. */
  hideWhenNoHistory?: boolean;
  className?: string;
}

export function BackButton({
  fallback = "/",
  href,
  label = "Voltar",
  showIcon = true,
  responsiveLabel = false,
  hideWhenNoHistory = false,
  variant = "outline",
  size = "sm",
  className,
  ...props
}: BackButtonProps) {
  const navigateBack = useNavigateBack();
  const canGoBack = useCanGoBack(hideWhenNoHistory);
  const labelNode = label ? (
    <span className={cn(responsiveLabel && "hidden sm:inline")}>{label}</span>
  ) : null;

  if (href) {
    return (
      <Button asChild variant={variant} size={size} className={className} aria-label={label}>
        <Link href={href}>
          {showIcon && <ArrowLeft className="size-4" />}
          {labelNode}
        </Link>
      </Button>
    );
  }

  if (hideWhenNoHistory && !canGoBack) {
    return null;
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className)}
      aria-label={label}
      onClick={() => navigateBack(fallback)}
      {...props}
    >
      {showIcon && <ArrowLeft className="size-4" />}
      {labelNode}
    </Button>
  );
}
