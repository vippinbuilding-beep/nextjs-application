"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@vippin/ui/button";
import { cn } from "@vippin/ui/lib/utils";
import { buildLoginUrl, type AuthRole } from "@/lib/auth/login-url";
import { LOGIN_ROLE_COPY } from "@/lib/auth/login-role-copy";

const ROLES: AuthRole[] = ["consumer", "creator"];

interface LoginRolePickerProps {
  next?: string | null;
  className?: string;
}

export function LoginRolePicker({ next, className }: LoginRolePickerProps) {
  return (
    <div className={cn("flex w-full flex-col gap-3", className)}>
      {ROLES.map((role) => {
        const copy = LOGIN_ROLE_COPY[role];
        const Icon = copy.icon;

        return (
          <Link
            key={role}
            href={buildLoginUrl({ role, next })}
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-auto w-full justify-between gap-2 rounded-2xl px-3 py-3 text-left whitespace-normal sm:gap-3 sm:px-4 sm:py-4"
            )}
          >
            <span className="flex min-w-0 items-start gap-2 sm:gap-3">
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl sm:size-10",
                  role === "creator" ? "bg-aurora text-white" : "bg-muted text-foreground"
                )}
              >
                <Icon className="size-4 sm:size-5" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5 sm:gap-1">
                <span className="font-semibold">{copy.badge}</span>
                <span className="text-muted-foreground text-xs leading-snug sm:text-sm">
                  {copy.description}
                </span>
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 sm:size-5" />
          </Link>
        );
      })}
    </div>
  );
}
