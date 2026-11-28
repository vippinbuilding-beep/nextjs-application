"use client";

import type { ReactNode } from "react";
import { LazyMotion, MotionConfig } from "motion/react";

import { springs } from "../lib/motion-springs";

const loadDomAnimation = () => import("../lib/motion-features").then((mod) => mod.default);

/**
 * Fica no layout raiz de cada app. A página carrega só o núcleo do Motion
 * (~5 KB); as features de animação (~29 KB) baixam depois da hidratação,
 * sem atrasar o carregamento (animação só acontece em resposta a ações).
 * Liga também o modo de movimento reduzido: quem pede menos movimento no
 * sistema fica sem transforms e layout, só com opacidade e cor.
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
 * Para telas que precisam de animação de layout (`layout`, `layoutId`) ou
 * arrastar (`drag`, `Reorder`). Baixa o resto das features sob demanda, só
 * quando a tela aparece.
 */
export function MotionMaxFeatures({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadDomMax} strict>
      {children}
    </LazyMotion>
  );
}
