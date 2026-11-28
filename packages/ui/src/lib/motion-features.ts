/**
 * Features leves do Motion (animação, hover/toque, saída, whileInView).
 * Arquivo à parte para o bundler separar num chunk que baixa depois da
 * hidratação: o primeiro carregamento leva só o núcleo (~5 KB).
 */
export { domAnimation as default } from "motion/react";
