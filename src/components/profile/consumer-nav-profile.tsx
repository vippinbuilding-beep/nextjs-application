"use client";

import Link from "next/link";

import { UserAvatar } from "@/components/ui/user-avatar";
import type { User } from "@/core/models/user";
import { cn } from "@/lib/utils";

function getDisplayName(user: User): string {
  return (
    user.name?.trim() ||
    user.displayName?.trim() ||
    user.email.split("@")[0] ||
    "Perfil"
  );
}

interface ConsumerNavProfileProps {
  user: User;
  className?: string;
}

/**
 * Navbar link to edit profile: avatar + display name.
 */
export function ConsumerNavProfile({ user, className }: ConsumerNavProfileProps) {
  const displayName = getDisplayName(user);

  return (
    <Link
      href="/profile/edit"
      className={cn(
        "flex items-center gap-2",
        className
      )}
      aria-label={`Editar perfil de ${displayName}`}
    >
      <UserAvatar
        userId={user.id}
        name={displayName}
        avatarPath={user.avatarPath}
        avatarUrl={user.avatarUrl}
        size="sm"
      />
      <span className="min-w-0 truncate text-sm font-bold">{displayName}</span>
    </Link>
  );
}

export { getDisplayName as getConsumerDisplayName };
