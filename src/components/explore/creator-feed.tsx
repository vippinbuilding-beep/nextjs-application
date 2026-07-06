import { Users } from "lucide-react";
import Link from "next/link";

import type { PublicCreator } from "@/core/repositories/creator-repository";
import { UserAvatar } from "@/components/ui/user-avatar";

interface CreatorFeedProps {
  creators: PublicCreator[];
  searching?: boolean;
  emptyLabel?: string;
}

/**
 * Horizontal strip of creator profiles for the explore page.
 */
export function CreatorFeed({
  creators,
  searching = false,
  emptyLabel = "Nenhum criador encontrado para essa busca.",
}: CreatorFeedProps) {
  if (!creators.length) {
    if (!searching) return null;

    return (
      <section className="flex flex-col gap-3">
        <CreatorFeedHeader searching />
        <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/40 px-4 py-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl border-2 border-border bg-background shadow-cartoon-sm">
            <Users className="text-muted-foreground size-6" />
          </span>
          <p className="text-muted-foreground text-sm font-medium">{emptyLabel}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <CreatorFeedHeader searching={searching} />

      <ul className="-mx-1 flex gap-3 overflow-x-auto p-2">
        {creators.map((creator) => (
          <li key={creator.id} className="shrink-0">
            <Link
              href={`/@${creator.slug}`}
              className="group flex w-28 flex-col items-center gap-2.5 rounded-2xl border-2 border-border bg-background p-3 shadow-cartoon-sm transition-all hover:-translate-y-0.5 hover:shadow-cartoon"
            >
              <UserAvatar
                userId={creator.id}
                name={creator.handle}
                avatarPath={creator.avatarPath}
                avatarUrl={creator.avatarUrl}
                size="lg"
              />
              <span className="line-clamp-2 w-full text-center text-xs leading-snug font-bold">
                @{creator.handle}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CreatorFeedHeader({ searching }: { searching: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h2 className="text-sm font-bold uppercase tracking-wide">Criadores</h2>
      <p className="text-muted-foreground text-xs font-medium">
        {searching
          ? "Perfis que batem com a sua busca. Toque para ver a vitrine."
          : "Criadores com produtos publicados. Use a busca acima para filtrar por nome ou @."}
      </p>
    </div>
  );
}
