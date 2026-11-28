import type { Transition } from "motion/react";

/**
 * Springs equivalentes às curvas CSS `--spring-*` do globals.css, para o
 * movimento em JS e em CSS combinar.
 */
export const springs = {
  /** Hover, toque, toggles, indicadores. Passa um pouco do ponto. */
  snappy: { type: "spring", bounce: 0.25, visualDuration: 0.3 },
  /** Painéis, diálogos, superfícies grandes. Sem passar do ponto. */
  soft: { type: "spring", bounce: 0, visualDuration: 0.35 },
  /** Só celebração (pagamento confirmado, onboarding concluído). */
  bouncy: { type: "spring", bounce: 0.45, visualDuration: 0.35 },
} satisfies Record<string, Transition>;

/** Saída rápida e sem mola: o que sai não deve chamar atenção. */
export const exitFast: Transition = { duration: 0.15, ease: [0.4, 0, 1, 1] };
