import { Banknote, Check, FileText, MessageCircle, Package, PlayCircle, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

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
 * Tudo em CSS, sem JS de animação (vem pronta do servidor):
 * - os cartões grandes já aparecem prontos; só o que é pequeno anima (o
 *   "Pago" e a notificação), com atraso. Animar os cartões grandes na
 *   entrada custava ~800 ms de trabalho no celular (Lighthouse);
 * - no desktop as camadas inclinam e se deslocam com o mouse, lendo
 *   `--px`/`--py` que a seção do hero escreve (usePointerVars); quanto mais
 *   na frente, mais a camada se move;
 * - ao rolar, as camadas se separam (animação ligada à rolagem do CSS).
 * Era feita com Motion, mas mesmo carregada depois ela gerava tarefas longas
 * de 100 a 160 ms no celular (Lighthouse).
 */

/** Quando o Pix "é pago" e a venda chega (ms desde a primeira pintura). */
const PAID_AT_MS = 1700;
const SALE_AT_MS = PAID_AT_MS + 450;

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
  enterAtMs,
  className,
  children,
}: {
  depth: number;
  /** Entra animada nesse instante; sem isso, já aparece pronta. */
  enterAtMs?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "scroll-drift absolute mouse:[transform:translateZ(calc(var(--depth)*40px))]",
        className
      )}
      // --depth alimenta o parallax, o mouse e a profundidade (translateZ só
      // com mouse: no celular a vitrine é plana, sem custo de camadas 3D).
      style={{ "--depth": depth } as CSSProperties}
    >
      <div className="mouse:transition-[translate] mouse:duration-[700ms] mouse:ease-spring-soft mouse:[translate:calc(var(--px,0)*24px*var(--depth))_calc(var(--py,0)*20px*var(--depth))]">
        {enterAtMs === undefined ? (
          children
        ) : (
          <div
            className="animate-in fade-in-0 zoom-in-94 slide-in-from-bottom-7 fill-mode-both duration-[700ms] ease-spring-soft"
            style={{ animationDelay: `${enterAtMs}ms` }}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

const surface = "bg-card text-card-foreground rounded-3xl border border-border";

export function HeroShowcase({ creator }: { creator: FeaturedCreator | null }) {
  const story = buildStory(creator);

  return (
    <div className="relative h-[440px] w-full max-w-[520px] mouse:[perspective:1200px] sm:h-[500px]">
      <div className="absolute inset-0 mouse:transition-transform mouse:duration-[800ms] mouse:ease-spring-soft mouse:[transform-style:preserve-3d] mouse:[transform:rotateX(calc(var(--py,0)*-14deg))_rotateY(calc(var(--px,0)*18deg))]">
        {/* Vitrine do criador */}
        <Layer depth={1} className="top-0 left-0 w-[80%]">
          <StorefrontCard story={story} />
        </Layer>

        {/* Pagamento Pix */}
        <Layer depth={2} className="top-[34%] right-0 w-[50%]">
          <div aria-hidden className={cn(surface, "flex flex-col items-center gap-3 p-4 shadow-elevated-xl")}>
            <span className="text-sm font-semibold">Pagar com Pix</span>
            <div className="relative w-full">
              <QrPattern className="w-full" />
              {/* "Pago": aparece no tempo certo, só com CSS */}
              <span
                className="bg-card/85 animate-in fade-in-0 fill-mode-both absolute inset-0 flex items-center justify-center rounded-xl duration-300"
                style={{ animationDelay: `${PAID_AT_MS}ms` }}
              >
                <span
                  className="bg-primary text-primary-foreground animate-in zoom-in-40 fill-mode-both ease-spring-bouncy flex size-14 items-center justify-center rounded-full duration-[600ms]"
                  style={{ animationDelay: `${PAID_AT_MS}ms` }}
                >
                  <svg viewBox="0 0 24 24" className="size-7" fill="none">
                    <path
                      d="M5 12.5l4.5 4.5L19 7.5"
                      stroke="currentColor"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pathLength={1}
                      strokeDasharray={1}
                      strokeDashoffset={1}
                      style={{ animation: `draw-stroke 350ms ease-out ${PAID_AT_MS + 150}ms forwards` }}
                    />
                  </svg>
                </span>
              </span>
            </div>
            <span className="text-muted-foreground relative flex h-5 w-full items-center justify-center text-xs font-medium">
              <span
                className="animate-out fade-out-0 fill-mode-forwards absolute inset-0 flex items-center justify-center gap-1.5 duration-200"
                style={{ animationDelay: `${PAID_AT_MS}ms` }}
              >
                <span className="bg-ring size-1.5 rounded-full" /> Aguardando pagamento
              </span>
              <span
                className="animate-in fade-in-0 fill-mode-both absolute inset-0 flex items-center justify-center gap-1.5 duration-300"
                style={{ animationDelay: `${PAID_AT_MS + 150}ms` }}
              >
                <Check className="size-3.5" /> Pago
              </span>
            </span>
          </div>
        </Layer>

        {/* A venda chega */}
        <Layer depth={3} enterAtMs={SALE_AT_MS} className="bottom-[2%] left-[4%] w-[66%]">
          <div
            aria-hidden
            className={cn(
              surface,
              "animate-in fill-mode-both ease-spring-bouncy flex items-center gap-3 p-3.5 pr-5 shadow-elevated-xl duration-[700ms]"
            )}
            // Entra girando de leve (tw-animate: --tw-enter-rotate).
            style={{ animationDelay: `${SALE_AT_MS}ms`, "--tw-enter-rotate": "-4deg" } as CSSProperties}
          >
            <span className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
              <Banknote className="size-5" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-semibold">{story.saleTitle}</span>
              <span className="text-muted-foreground truncate text-xs">{story.saleText}</span>
            </span>
          </div>
        </Layer>
      </div>
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
      className={cn(className, "outline-none transition-colors hover:border-ring/40 focus-visible:ring-4 focus-visible:ring-ring/30")}
    >
      <span className="sr-only">Ver a vitrine de </span>
      {content}
    </Link>
  );
}
