"use client";

import { Users } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

import type { PublicCreator } from "@vippin/core/repositories/creator-repository";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@vippin/ui/lib/utils";

/** Além deste arrasto (px) o gesto vira "puxar", não clique. */
const DRAG_THRESHOLD = 6;

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
  const scrollRef = useRef<HTMLUListElement>(null);
  // Estado do arrasto vive em ref: mover a faixa a cada pixel não deve re-render.
  const dragRef = useRef({
    active: false,
    dragged: false,
    startX: 0,
    startScrollLeft: 0,
  });

  function handlePointerDown(event: React.PointerEvent<HTMLUListElement>) {
    // Só mouse: em toque a rolagem nativa já cuida do arrasto.
    if (event.pointerType !== "mouse") return;
    const el = scrollRef.current;
    if (!el) return;
    dragRef.current = {
      active: true,
      dragged: false,
      startX: event.clientX,
      startScrollLeft: el.scrollLeft,
    };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLUListElement>) {
    const drag = dragRef.current;
    const el = scrollRef.current;
    if (!drag.active || !el) return;

    const delta = event.clientX - drag.startX;
    if (!drag.dragged && Math.abs(delta) < DRAG_THRESHOLD) return;

    // Virou arrasto: passa a capturar o ponteiro (segue mesmo saindo da faixa) e
    // desliga o snap para o movimento acompanhar o cursor sem travar.
    if (!drag.dragged) {
      drag.dragged = true;
      el.setPointerCapture(event.pointerId);
      el.style.scrollSnapType = "none";
    }
    el.scrollLeft = drag.startScrollLeft - delta;
  }

  function endDrag(event: React.PointerEvent<HTMLUListElement>) {
    const drag = dragRef.current;
    const el = scrollRef.current;
    if (!drag.active) return;
    drag.active = false;
    if (el) {
      el.style.scrollSnapType = "";
      if (el.hasPointerCapture(event.pointerId)) {
        el.releasePointerCapture(event.pointerId);
      }
    }
  }

  // Chamado na fase de captura: se acabamos de arrastar, engole o clique para o
  // arrasto não abrir a vitrine do criador que estava sob o cursor.
  function handleClickCapture(event: React.MouseEvent<HTMLUListElement>) {
    if (!dragRef.current.dragged) return;
    dragRef.current.dragged = false;
    event.preventDefault();
    event.stopPropagation();
  }

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

      <ul
        ref={scrollRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={handleClickCapture}
        className={cn(
          "-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-2 px-2 py-2",
          // Esconde a barra de rolagem nativa (o gesto de arrastar continua).
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          // Esmaece as bordas: os cards se dissolvem no fundo em vez de serem
          // cortados por uma linha dura, sinalizando que há mais para rolar.
          "[mask-image:linear-gradient(to_right,transparent,black_1.5rem,black_calc(100%-1.5rem),transparent)]",
          // Segurar e arrastar para percorrer a faixa (cursor de "mãozinha").
          "cursor-grab active:cursor-grabbing select-none"
        )}
      >
        {creators.map((creator) => (
          <li key={creator.id} className="shrink-0 snap-start">
            <Link
              href={`/@${creator.slug}`}
              draggable={false}
              className="group flex w-28 flex-col items-center gap-2.5 rounded-2xl border-2 border-border bg-background p-3 shadow-cartoon-sm transition-all hover:-translate-y-1 hover:shadow-cartoon"
            >
              <UserAvatar
                userId={creator.id}
                name={creator.handle}
                avatarPath={creator.avatarPath}
                avatarUrl={creator.avatarUrl}
                size="lg"
              />
              <span className="line-clamp-2 w-full text-center text-xs leading-snug font-bold">
                {creator.handle}
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
          : "Criadores na plataforma. Use a busca acima para filtrar por nome."}
      </p>
    </div>
  );
}
