/**
 * Movimento da Vippin com Motion (motion.dev). Ponto único de import: os apps
 * usam `@vippin/ui/lib/motion`, nunca `motion/react` direto, para manter as
 * mesmas springs em tudo e o pacote numa versão só.
 *
 * Regras (ver CLAUDE.md, "Movimento"):
 * - Use `m.div`/`m.span`... (não `motion.div`): o `MotionProvider` carrega as
 *   features sob demanda (LazyMotion `strict` acusa `motion.*` no dev).
 * - Só em client components. Server components continuam sem JS de animação.
 * - Anime transform, opacity, clipPath e filter. Layout/arrastar pedem
 *   `MotionMaxFeatures` em volta da tela que precisa deles.
 * - Nada de entrada animada no carregamento da página (atrasa o LCP).
 */

/** Elementos animáveis leves (`m.div`, `m.span`...). */
export * as m from "motion/react-m";

export {
  AnimatePresence,
  animate,
  stagger,
  useAnimate,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
export type { MotionValue, Transition, Variants } from "motion/react";

export { exitFast, springs } from "./motion-springs";
