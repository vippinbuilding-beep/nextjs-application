"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
              "h-auto w-full justify-between gap-3 px-4 py-4 text-left whitespace-normal"
            )}
          >
            <span className="flex min-w-0 items-start gap-3">
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-border shadow-cartoon-sm",
                  role === "creator" ? "bg-primary" : "bg-[#4dd2ff]"
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-bold">{copy.badge}</span>
                <span className="text-muted-foreground text-sm font-medium leading-snug">
                  {copy.description}
                </span>
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0" />
          </Link>
        );
      })}
    </div>
  );
}
