"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AuthEntryActions } from "@/components/navigation/auth-entry-actions";
import { SiteLogo } from "@/components/ui/site-logo";
import { cn } from "@vippin/ui/lib/utils";
import { ThemeToggle } from "@vippin/ui/theme-toggle";

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center p-3 sm:p-4">
      <nav
        className={cn(
          "flex w-full max-w-5xl items-center justify-between gap-3 rounded-2xl border border-border px-3 py-2 transition-[color,background-color,border-color,opacity,transform] duration-200 sm:px-5 sm:py-3",
          scrolled
            ? "bg-background/90 shadow-elevated"
            : "border-transparent bg-transparent shadow-none"
        )}
      >
        <Link href="/" className="flex items-center gap-2">
          <SiteLogo size={36} priority nameClassName="text-xl" />
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <AuthEntryActions />
        </div>
      </nav>
    </header>
  );
}
