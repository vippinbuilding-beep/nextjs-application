"use client";

import Link from "next/link";

import { UserAvatar } from "@/components/ui/user-avatar";
import type { User } from "@/core/models/user";
import { resolveConsumerDisplayName } from "@/lib/profile/display-name";
import { cn } from "@/lib/utils";

interface ConsumerNavProfileProps {
  user: User;
  className?: string;
}

/**
 * Navbar link to edit profile: avatar + display name.
 */
export function ConsumerNavProfile({ user, className }: ConsumerNavProfileProps) {
  const displayName = resolveConsumerDisplayName(user);

  return (
    <Link
      href="/profile/edit"
      className={cn("flex items-center gap-2", className)}
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

export { resolveConsumerDisplayName as getConsumerDisplayName };
