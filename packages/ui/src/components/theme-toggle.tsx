"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";

import { cn } from "../lib/utils";
import { applyTheme, currentTheme, readThemePreference, setTheme, systemTheme } from "../lib/theme";

/** Observa a classe `dark` do <html> (muda pelo toggle ou pelo sistema). */
function subscribeToTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  // Preferência "sistema": acompanha quando o aparelho troca de tema.
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    if (readThemePreference() === "system") applyTheme(systemTheme());
  };
  media.addEventListener("change", onSystemChange);

  return () => {
    observer.disconnect();
    media.removeEventListener("change", onSystemChange);
  };
}

const getIsDark = () => currentTheme() === "dark";
const getServerIsDark = () => false;

/**
 * Interruptor claro/escuro. A troca revela o tema novo num círculo que nasce
 * no próprio botão (ver setTheme). O visual do botão segue a classe `dark`
 * via CSS, então já aparece certo antes da hidratação.
 */
function ThemeToggle({ className, ...props }: Omit<React.ComponentProps<"button">, "onClick">) {
  const isDark = React.useSyncExternalStore(subscribeToTheme, getIsDark, getServerIsDark);

  function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setTheme(isDark ? "light" : "dark", {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  }

  return (
    <button
      type="button"
      data-slot="theme-toggle"
      aria-label="Tema escuro"
      aria-pressed={isDark}
      onClick={toggle}
      className={cn(
        "relative inline-flex h-9 w-16 shrink-0 cursor-pointer items-center rounded-full border border-border bg-muted p-[3px] outline-none",
        "transition-transform duration-150 ease-spring hover:scale-105 active:scale-95",
        "focus-visible:ring-4 focus-visible:ring-ring/30",
        className
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "relative flex size-7 items-center justify-center rounded-full bg-primary shadow-glow-primary",
          "transition-transform duration-[420ms] ease-spring",
          "dark:translate-x-7 dark:rotate-[360deg] dark:bg-accent dark:shadow-[inset_0_0_0_1px_var(--input),0_4px_12px_-2px_var(--ring)]"
        )}
      >
        <Sun
          className="absolute size-4 text-primary-foreground transition-[transform,opacity] duration-[420ms] ease-spring dark:rotate-90 dark:scale-50 dark:opacity-0"
          strokeWidth={2.4}
        />
        <Moon
          className="absolute size-4 -rotate-90 scale-50 text-ring opacity-0 transition-[transform,opacity] duration-[420ms] ease-spring dark:rotate-0 dark:scale-100 dark:opacity-100"
          strokeWidth={2.4}
        />
      </span>
    </button>
  );
}

export { ThemeToggle };
