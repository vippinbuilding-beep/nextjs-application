"use client";

import { Banknote, Check, FileText, MessageCircle, Package, PlayCircle, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

import {
  m,
  springs,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "@vippin/ui/lib/motion";
import { cn } from "@vippin/ui/lib/utils";
import { formatBRL } from "@vippin/core/domain/money";
import type { ProductType } from "@vippin/core/models/product";

import { ProductThumbnail } from "@/components/products/product-thumbnail";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { FeaturedCreator } from "@/lib/featured-creator";

/**
 * "Vitrine viva" do hero: a história do produto em três camadas. A vitrine
 * do criador em destaque (dados reais, ver lib/featured-creator) aparece, o
 * Pix é pago e a venda chega como notificação. O título ao lado é o conteúdo
 * principal e aparece pronto (LCP). Sequência única, sem loop. Sem criador
 * em destaque, mostra um exemplo genérico.
 *
 * Profundidade: no desktop as camadas inclinam e se deslocam com o mouse
 * (quanto mais na frente, mais se move); ao rolar, elas se separam.
 *
 * É a única peça da landing com Motion e carrega sob demanda (next/dynamic),
 * depois da página pronta: o espaço já fica reservado, sem pular layout.
 */

function useMotionPrefs(): { pointer: boolean; scroll: boolean } {
  const [prefs, setPrefs] = useState({ pointer: false, scroll: false });
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    setPrefs({ pointer: fine && !reduce, scroll: !reduce });
  }, []);
  return prefs;
}

/** Mouse dentro da seção do hero, de -0.5 a 0.5, suavizado por mola. */
function useSectionPointer(sectionRef: RefObject<HTMLElement | null>, enabled: boolean) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 140, damping: 20, mass: 0.6 });
  const y = useSpring(rawY, { stiffness: 140, damping: 20, mass: 0.6 });

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !enabled) return;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = section.getBoundingClientRect();
      rawX.set((event.clientX - rect.left) / rect.width - 0.5);
      rawY.set((event.clientY - rect.top) / rect.height - 0.5);
    };
    const onLeave = () => {
      rawX.set(0);
      rawY.set(0);
    };
    section.addEventListener("pointermove", onMove, { passive: true });
    section.addEventListener("pointerleave", onLeave);
    return () => {
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
    };
  }, [sectionRef, enabled, rawX, rawY]);

  return { x, y };
}

const PAID_DELAY_MS = 1700;

interface ShowcaseTile {
  key: string;
  title: string;
  detail: string;
  icon: LucideIcon;
  type?: ProductType;
  imageUrl?: string | null;
  wide?: boolean;
}

interface ShowcaseStory {
  href: string | null;
  name: string;
  handle: string;
  bio: string;
  avatarUrl: string | null;
  tiles: ShowcaseTile[];
  saleTitle: string;
  saleText: string;
}

const TYPE_ICONS: Record<string, LucideIcon> = { video: PlayCircle, document: FileText, physical: Package };

/** Exemplo genérico, usado só quando não há criador em destaque. */
const EXAMPLE_STORY: ShowcaseStory = {
  href: null,
  name: "Sua vitrine",
  handle: "@voce",
  bio: "Aulas e materiais do seu jeito",
  avatarUrl: null,
  tiles: [
    { key: "a", title: "Sua primeira aula", detail: "R$ 49,90", icon: PlayCircle },
    { key: "b", title: "Material de apoio", detail: "R$ 19,90", icon: FileText },
  ],
  saleTitle: "Nova venda!",
  saleText: "R$ 49,90 no Pix por Sua primeira aula",
};

function buildStory(creator: FeaturedCreator | null): ShowcaseStory {
  if (!creator) return EXAMPLE_STORY;
  const base = {
    href: `/@${creator.slug}`,
    name: creator.name,
    handle: `@${creator.slug}`,
    bio: creator.bio ?? "Criador na Vippin",
    avatarUrl: creator.avatarUrl,
  };

  if (creator.products.length > 0) {
    const [first] = creator.products;
    return {
      ...base,
      tiles: creator.products.map((product) => ({
        key: product.id,
        title: product.title,
        detail: product.priceCents > 0 ? formatBRL(product.priceCents) : "Grátis",
        icon: TYPE_ICONS[product.type] ?? Package,
        type: product.type,
        imageUrl: product.thumbnailUrl,
      })),
      saleTitle: "Nova venda!",
      saleText: `${formatBRL(first.priceCents)} no Pix por ${first.title}`,
    };
  }

  if (creator.askMePriceCents !== null) {
    const price = formatBRL(creator.askMePriceCents);
    return {
      ...base,
      tiles: [
        {
          key: "ask-me",
          title: "Pergunte para mim",
          detail: `${price} por pergunta, resposta em vídeo`,
          icon: MessageCircle,
          wide: true,
        },
      ],
      saleTitle: "Nova pergunta!",
      saleText: `${price} no Pix para ${creator.name}`,
    };
  }

  return EXAMPLE_STORY;
}

/** Padrão de QR decorativo (não é um QR de verdade), sempre o mesmo. */
const QR_CELLS = (() => {
  const size = 17;
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const cells: { x: number; y: number }[] = [];
  const isFinder = (x: number, y: number) =>
    (x < 5 && y < 5) || (x > size - 6 && y < 5) || (x < 5 && y > size - 6);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (isFinder(x, y)) continue;
      if (random() > 0.52) cells.push({ x, y });
    }
  }
  return { size, cells };
})();

function QrPattern({ className }: { className?: string }) {
  const { size, cells } = QR_CELLS;
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width={5} height={5} rx={1.2} className="fill-foreground" />
      <rect x={x + 1} y={y + 1} width={3} height={3} rx={0.6} className="fill-card" />
      <rect x={x + 1.8} y={y + 1.8} width={1.4} height={1.4} rx={0.3} className="fill-foreground" />
    </g>
  );
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={className}>
      {cells.map((cell) => (
        <rect
          key={`${cell.x}-${cell.y}`}
          x={cell.x + 0.1}
          y={cell.y + 0.1}
          width={0.8}
          height={0.8}
          rx={0.2}
          className="fill-foreground"
        />
      ))}
      {finder(0, 0)}
      {finder(size - 5, 0)}
      {finder(0, size - 5)}
    </svg>
  );
}

/** Uma camada: rolagem (fora), mouse (meio) e entrada (dentro). */
function Layer({
  depth,
  pointerX,
  pointerY,
  scrollProgress,
  enabled,
  delay,
  className,
  children,
}: {
  depth: number;
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  scrollProgress: MotionValue<number>;
  enabled: { pointer: boolean; scroll: boolean };
  delay: number;
  className?: string;
  children: ReactNode;
}) {
  const scrollY = useTransform(scrollProgress, [0, 1], [0, -70 * depth]);
  const moveX = useTransform(pointerX, [-0.5, 0.5], [-12 * depth, 12 * depth]);
  const moveY = useTransform(pointerY, [-0.5, 0.5], [-10 * depth, 10 * depth]);

  return (
    <m.div
      className={cn("absolute", className)}
      // translateZ: profundidade real na perspectiva (e quem está na frente
      // fica na frente, mesmo inclinado).
      style={enabled.scroll ? { y: scrollY, z: depth * 40 } : { z: depth * 40 }}
    >
      <m.div style={enabled.pointer ? { x: moveX, y: moveY } : undefined}>
        <m.div
          initial={{ opacity: 0, y: 28, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...springs.soft, delay }}
        >
          {children}
        </m.div>
      </m.div>
    </m.div>
  );
}

const surface = "bg-card text-card-foreground rounded-3xl border border-border";

export default function HeroShowcase({
  sectionRef,
  creator,
}: {
  sectionRef: RefObject<HTMLElement | null>;
  creator: FeaturedCreator | null;
}) {
  const story = buildStory(creator);
  const ref = useRef<HTMLDivElement>(null);
  const enabled = useMotionPrefs();
  const { x: pointerX, y: pointerY } = useSectionPointer(sectionRef, enabled.pointer);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const rotateX = useTransform(pointerY, [-0.5, 0.5], [7, -7]);
  const rotateY = useTransform(pointerX, [-0.5, 0.5], [-9, 9]);

  const [paid, setPaid] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setPaid(true), enabled.scroll ? PAID_DELAY_MS : 0);
    return () => window.clearTimeout(timer);
  }, [enabled.scroll]);

  return (
    <div ref={ref} className="relative h-[440px] w-full max-w-[520px] [perspective:1200px] sm:h-[500px]">
      <m.div
        className="absolute inset-0 [transform-style:preserve-3d]"
        style={enabled.pointer ? { rotateX, rotateY } : undefined}
      >
        {/* Vitrine do criador */}
        <Layer
          depth={1}
          delay={0.1}
          pointerX={pointerX}
          pointerY={pointerY}
          scrollProgress={scrollYProgress}
          enabled={enabled}
          className="top-0 left-0 w-[80%]"
        >
          <StorefrontCard story={story} />
        </Layer>

        {/* Pagamento Pix */}
        <Layer
          depth={2}
          delay={0.55}
          pointerX={pointerX}
          pointerY={pointerY}
          scrollProgress={scrollYProgress}
          enabled={enabled}
          className="top-[34%] right-0 w-[50%]"
        >
          <div aria-hidden className={cn(surface, "flex flex-col items-center gap-3 p-4 shadow-elevated-xl")}>
            <span className="text-sm font-semibold">Pagar com Pix</span>
            <div className="relative w-full">
              <QrPattern className="w-full" />
              {paid && (
                  <m.span
                    key="paid"
                    className="bg-card/85 absolute inset-0 flex items-center justify-center rounded-xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.25 }}
                  >
                    <m.span
                      className="bg-primary text-primary-foreground flex size-14 items-center justify-center rounded-full"
                      initial={{ scale: 0.4 }}
                      animate={{ scale: 1 }}
                      transition={springs.bouncy}
                    >
                      <svg viewBox="0 0 24 24" className="size-7" fill="none">
                        <m.path
                          d="M5 12.5l4.5 4.5L19 7.5"
                          stroke="currentColor"
                          strokeWidth={3}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.35, delay: 0.15, ease: "easeOut" }}
                        />
                      </svg>
                    </m.span>
                  </m.span>
              )}
            </div>
            <span className="text-muted-foreground flex h-5 items-center gap-1.5 text-xs font-medium">
              {paid ? (
                <>
                  <Check className="size-3.5" /> Pago
                </>
              ) : (
                <>
                  <span className="bg-ring size-1.5 animate-pulse rounded-full" /> Aguardando pagamento
                </>
              )}
            </span>
          </div>
        </Layer>

        {/* A venda chega */}
        <Layer
          depth={3}
          delay={(PAID_DELAY_MS + 450) / 1000}
          pointerX={pointerX}
          pointerY={pointerY}
          scrollProgress={scrollYProgress}
          enabled={enabled}
          className="bottom-[2%] left-[4%] w-[66%]"
        >
          <m.div
            aria-hidden
            className={cn(surface, "flex items-center gap-3 p-3.5 pr-5 shadow-elevated-xl")}
            initial={{ rotate: -4 }}
            animate={{ rotate: 0 }}
            transition={{ ...springs.bouncy, delay: (PAID_DELAY_MS + 450) / 1000 }}
          >
            <span className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
              <Banknote className="size-5" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-semibold">{story.saleTitle}</span>
              <span className="text-muted-foreground truncate text-xs">{story.saleText}</span>
            </span>
          </m.div>
        </Layer>
      </m.div>
    </div>
  );
}

/** Cartão da vitrine: perfil e o que o criador vende. Leva à vitrine real. */
function StorefrontCard({ story }: { story: ShowcaseStory }) {
  const content = (
    <>
      <span className="flex items-center gap-3">
        {story.avatarUrl ? (
          <UserAvatar userId="" name={story.name} src={story.avatarUrl} size="md" className="size-11" />
        ) : (
          <span aria-hidden className="bg-aurora size-11 shrink-0 rounded-full" />
        )}
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-semibold">{story.name}</span>
          <span className="text-muted-foreground truncate text-sm">{story.handle}</span>
        </span>
      </span>
      <span className="text-muted-foreground line-clamp-2 text-sm leading-snug">{story.bio}</span>
      <span className="grid grid-cols-2 gap-3">
        {story.tiles.map((tile, index) => (
          <span key={tile.key} className={cn("flex min-w-0 flex-col gap-2", tile.wide && "col-span-2")}>
            {tile.type ? (
              <ProductThumbnail
                type={tile.type}
                thumbnailUrl={tile.imageUrl}
                rounded="rounded-2xl"
                className="aspect-[4/3] w-full border-0"
                iconClassName="size-7"
                sizes="200px"
              />
            ) : (
              <span
                aria-hidden
                className={cn(
                  "flex items-center justify-center rounded-2xl",
                  tile.wide ? "h-24 gap-3" : "aspect-[4/3]",
                  index === 0 ? "bg-aurora text-white" : "bg-secondary text-secondary-foreground"
                )}
              >
                <tile.icon className="size-7" />
              </span>
            )}
            <span className="truncate text-sm font-semibold">{tile.title}</span>
            <span className="text-muted-foreground -mt-1.5 truncate text-xs">{tile.detail}</span>
          </span>
        ))}
      </span>
    </>
  );

  const className = cn(surface, "flex flex-col gap-4 p-5 shadow-elevated-lg");

  if (!story.href) {
    return (
      <div aria-hidden className={className}>
        {content}
      </div>
    );
  }

  return (
    <Link
      href={story.href}
      aria-label={`Ver a vitrine de ${story.name}`}
      className={cn(className, "outline-none transition-colors hover:border-ring/40 focus-visible:ring-4 focus-visible:ring-ring/30")}
    >
      {content}
    </Link>
  );
}
