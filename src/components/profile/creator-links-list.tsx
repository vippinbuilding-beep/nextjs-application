import { ExternalLink, Link2 } from "lucide-react";

import type { ProfileLink } from "@/core/models/profile-link";
import { ProfileLinkThumbnail } from "@/components/profile/profile-link-thumbnail";
import Link from "next/link";

interface CreatorLinksListProps {
  links: ProfileLink[];
  emptyLabel?: string;
}

export function CreatorLinkCard({ link }: { link: ProfileLink }) {
  return (
    <Link
      href={link.url}
      className="group flex items-center gap-3 rounded-xl border-2 border-border bg-background p-3 shadow-cartoon-sm transition-all hover:-translate-y-0.5 hover:bg-primary hover:shadow-cartoon"
    >
      <ProfileLinkThumbnail
        url={link.url}
        title={link.title}
        linkId={link.id}
        imagePath={link.imagePath}
      />
      <span className="min-w-0 flex-1 text-left font-semibold leading-tight">
        {link.title}
      </span>
      <ExternalLink className="size-4 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
    </Link>
  );
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
          <CreatorLinkCard link={link} />
        </li>
      ))}
    </ul>
  );
}
