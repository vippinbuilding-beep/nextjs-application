"use client";

import { cn } from "../lib/utils";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Número que rola como odômetro quando o valor muda (ex.: trocar o período
 * do painel). Recebe o texto já formatado ("R$ 1.234,56", "12", "45,3%"):
 * cada dígito é uma fita de 0 a 9 que desliza até o dígito certo, só com
 * transform. No carregamento já aparece no valor final (o HTML do servidor é
 * o número certo); só a mudança anima. Leitores de tela leem o texto normal.
 */
export function RollingNumber({ value, className }: { value: string; className?: string }) {
  const chars = Array.from(value);

  return (
    <span className={cn("relative inline-flex tabular-nums", className)}>
      <span className="sr-only">{value}</span>
      <span aria-hidden className="inline-flex">
        {chars.map((char, index) => {
          // Chave pela posição a partir da direita: unidades continuam sendo
          // unidades quando o número ganha ou perde casas.
          const key = chars.length - index;
          if (!/\d/.test(char)) {
            return (
              <span key={`s${key}`} className="h-[1.2em] whitespace-pre leading-[1.2em]">
                {char}
              </span>
            );
          }
          const digit = Number(char);
          return (
            <span key={`d${key}`} className="relative inline-block h-[1.2em] overflow-hidden leading-[1.2em]">
              <span
                className="flex flex-col transition-transform duration-[700ms] ease-spring"
                style={{
                  transform: `translateY(${-digit * 10}%)`,
                  transitionDelay: `${Math.min(index, 8) * 30}ms`,
                }}
              >
                {DIGITS.map((n) => (
                  <span key={n} className="block h-[1.2em]">
                    {n}
                  </span>
                ))}
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}
