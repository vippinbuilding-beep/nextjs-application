import { ExternalLink, Link2 } from "lucide-react";
import Image from "next/image";

import type { ProfileLink } from "@/core/models/profile-link";
import { getProfileLinkImageUrl } from "@/lib/supabase/storage";

interface CreatorLinksListProps {
  links: ProfileLink[];
  emptyLabel?: string;
}

/**
 * Linktree-style vertical list of outbound links for a creator profile.
 */
export function CreatorLinksList({
  links,
  emptyLabel = "Nenhum link publicado ainda.",
}: CreatorLinksListProps) {
  if (links.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl border-2 border-border bg-muted">
          <Link2 className="size-6" />
        </span>
        <p className="text-muted-foreground text-sm">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {links.map((link) => (
        <li key={link.id}>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 rounded-xl border-2 border-border bg-background p-3 shadow-cartoon-sm transition-all hover:-translate-y-0.5 hover:bg-primary hover:shadow-cartoon"
          >
            <LinkCover link={link} />
            <span className="min-w-0 flex-1 text-left font-semibold leading-tight">
              {link.title}
            </span>
            <ExternalLink className="size-4 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
          </a>
        </li>
      ))}
    </ul>
  );
}

function LinkCover({ link }: { link: ProfileLink }) {
  if (link.imagePath) {
    return (
      <span className="relative size-12 shrink-0 overflow-hidden rounded-lg border-2 border-border bg-muted">
        <Image
          src={getProfileLinkImageUrl(link.id)}
          alt=""
          fill
          className="object-cover"
          sizes="48px"
          unoptimized
        />
      </span>
    );
  }

  return (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border-2 border-border bg-muted">
      <Link2 className="size-5" />
    </span>
  );
}
