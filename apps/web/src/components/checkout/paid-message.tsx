import type { CSSProperties, ReactNode } from "react";

/** Cores das partículas: só tokens (amarelo, violeta, aurora, verde). */
const PARTICLE_COLORS = ["var(--primary)", "var(--ring)", "var(--aurora)", "var(--success)"];

/** Partículas da comemoração: ângulo, distância, tamanho e cor de cada uma. */
const PARTICLES = Array.from({ length: 14 }, (_, index) => ({
  angle: (360 / 14) * index + (index % 2 ? 9 : -9),
  distance: index % 3 === 0 ? 82 : index % 3 === 1 ? 66 : 56,
  size: index % 3 === 0 ? 10 : 8,
  color: PARTICLE_COLORS[index % PARTICLE_COLORS.length],
}));

/**
 * Pagamento confirmado (diálogo do Pix e checkout físico). O momento de
 * destaque do fluxo: o círculo cresce com repique, o check se desenha, um
 * anel se espalha e partículas estouram uma vez. CSS puro (keyframes no
 * globals.css), sem JS de animação; movimento reduzido desliga tudo.
 */
export function PaidMessage({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-2 py-6 text-center">
      <span className="relative mb-2 flex size-16 items-center justify-center">
        {/* Anel que se espalha */}
        <span
          aria-hidden
          className="bg-success absolute inset-0 rounded-full opacity-0 [animation:ring-out_900ms_var(--spring-soft)_200ms_both]"
        />
        {/* Partículas */}
        <span aria-hidden className="absolute inset-0">
          {PARTICLES.map((particle, index) => (
            <span
              key={index}
              className="absolute top-1/2 left-1/2 rounded-full opacity-0 [animation:particle-burst_820ms_cubic-bezier(0.2,0.7,0.3,1)_180ms_both]"
              style={
                {
                  "--angle": `${particle.angle}deg`,
                  "--distance": `${particle.distance}px`,
                  width: particle.size,
                  height: particle.size,
                  marginLeft: -particle.size / 2,
                  marginTop: -particle.size / 2,
                  background: particle.color,
                } as CSSProperties
              }
            />
          ))}
        </span>
        {/* Círculo com o check que se desenha */}
        <span className="bg-success text-background animate-in zoom-in-50 fade-in-0 ease-spring-bouncy relative flex size-16 items-center justify-center rounded-full duration-[600ms]">
          <svg viewBox="0 0 24 24" className="size-8" fill="none" aria-hidden>
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1}
              className="[animation:draw-stroke_420ms_ease-out_260ms_forwards]"
            />
          </svg>
        </span>
      </span>
      <p className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both text-lg font-semibold delay-300 duration-500 ease-spring-soft">
        {title}
      </p>
      <p className="text-muted-foreground animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both text-sm delay-[380ms] duration-500 ease-spring-soft">
        {text}
      </p>
      {children}
    </div>
  );
}
