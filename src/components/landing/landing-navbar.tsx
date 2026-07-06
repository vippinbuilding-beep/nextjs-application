"use client";

import { Rocket } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { SiteLogo } from "@/components/ui/site-logo";
import { cn } from "@/lib/utils";

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
          "flex w-full max-w-5xl items-center justify-between gap-3 rounded-2xl border-2 border-border px-3 py-2 transition-all duration-200 sm:px-5 sm:py-3",
          scrolled
            ? "bg-background/90 shadow-cartoon backdrop-blur-md"
            : "border-transparent bg-transparent shadow-none"
        )}
      >
        <Link href="/" className="flex items-center gap-2">
          <SiteLogo size={36} priority nameClassName="text-xl" />
        </Link>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
            <Link href="/login?role=consumer">Entrar como usuário</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/login?role=creator">
              <Rocket className="size-4" />
              Sou criador
            </Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
