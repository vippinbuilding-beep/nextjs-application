import Link from "next/link";

import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@vippin/ui/lib/utils";

interface CreatorProfileLinkProps {
  userId: string;
  slug: string;
  handle: string;
  avatarPath?: string | null;
  avatarUrl?: string | null;
  className?: string;
  variant?: "card" | "inline";
}

export function CreatorProfileLink({
  userId,
  slug,
  handle,
  avatarPath,
  avatarUrl,
  className,
  variant = "card",
}: CreatorProfileLinkProps) {
  if (variant === "inline") {
    return (
      <Link
        href={`/@${slug}`}
        className={cn(
          "group inline-flex max-w-full items-center gap-2.5 rounded-lg py-0.5  ",
          className
        )}
      >
        <UserAvatar
          userId={userId}
          name={handle}
          avatarPath={avatarPath}
          avatarUrl={avatarUrl}
          size="sm"
          className="size-9"
        />
        <span className="truncate text-sm font-bold group-hover:underline">
          {handle}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={`/@${slug}`}
      className={cn(
        "group flex items-center gap-3",
        className
      )}
    >
      <UserAvatar
        userId={userId}
        name={handle}
        avatarPath={avatarPath}
        avatarUrl={avatarUrl}
        size="md"
      />
      <span className="min-w-0 flex flex-col gap-0.5">
        <span className="text-muted-foreground text-xs font-medium">Criador</span>
        <span className="truncate font-bold group-hover:underline">{handle}</span>
      </span>
    </Link>
  );
}
