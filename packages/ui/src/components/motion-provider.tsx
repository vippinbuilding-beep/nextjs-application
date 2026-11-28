"use client";

import type { ReactNode } from "react";
import { LazyMotion, MotionConfig } from "motion/react";

import { springs } from "../lib/motion-springs";

const loadDomAnimation = () => import("../lib/motion-features").then((mod) => mod.default);

/**
 * Envolve uma peça que usa Motion (`m.div`...). NÃO vai no layout raiz:
 * mesmo o núcleo do Motion custou uma tarefa longa de ~240 ms no celular
 * antes do LCP. Cada peça com Motion carrega sob demanda (`next/dynamic`) e
 * se envolve neste provider (ex.: a vitrine do hero). As features baixam à
 * parte. Liga também o modo de movimento reduzido: quem pede menos
 * movimento fica sem transforms e layout, só com opacidade e cor.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadDomAnimation} strict>
      <MotionConfig reducedMotion="user" transition={springs.soft}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}

const loadDomMax = () => import("../lib/motion-max-features").then((mod) => mod.default);

/**
 * Como o `MotionProvider`, mas com as features completas: para peças que
 * precisam de animação de layout (`layout`, `layoutId`) ou arrastar
 * (`drag`, `Reorder`), como a pilha de avisos.
 */
export function MotionMaxFeatures({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadDomMax} strict>
      <MotionConfig reducedMotion="user" transition={springs.soft}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
