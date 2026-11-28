/**
 * Tema claro/escuro da Vippin. A classe `dark` no <html> liga os tokens do
 * tema escuro (packages/ui/src/styles/globals.css).
 *
 * Desempenho da troca: View Transitions. O navegador congela a tela antiga
 * numa imagem e só um clip-path circular é animado (GPU), sem duplicar o DOM
 * e sem JS por frame. Fica instantânea quando o navegador não suporta, quando
 * a pessoa pede menos movimento ou em aparelho com pouca memória.
 */

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "vippin-theme";

const REVEAL_DURATION_MS = 560;
/** Spring sem passar do ponto (mesma curva do --spring-soft do globals.css). */
const REVEAL_SPRING =
  "linear(0, 0.049, 0.157, 0.285, 0.411, 0.525, 0.624, 0.706, 0.772, 0.825, 0.866, 0.899, 0.924, 0.943, 0.957, 0.968, 0.976, 0.983, 0.987, 0.991, 0.993, 0.995, 0.996, 0.997, 1)";
const REVEAL_FALLBACK_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

function revealEasing(): string {
  return CSS.supports("transition-timing-function", REVEAL_SPRING) ? REVEAL_SPRING : REVEAL_FALLBACK_EASING;
}

/**
 * Roda no <head> antes da primeira pintura (ver ThemeScript), para a página
 * já abrir no tema certo. Mantido em ES5 e sem dependências.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var d=p==="dark"||((!p||p==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function readThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function systemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === "system" ? systemTheme() : preference;
}

export function currentTheme(): ResolvedTheme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyTheme(theme: ResolvedTheme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function saveThemePreference(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Modo privado / storage cheio: o tema vale só nesta aba.
  }
}

function canAnimateThemeChange(): boolean {
  if (typeof document.startViewTransition !== "function") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  // Aparelho fraco: a captura da tela inteira pode travar. Melhor trocar na hora.
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof memory === "number" && memory <= 2) return false;
  return true;
}

export interface ThemeChangeOrigin {
  x: number;
  y: number;
}

/**
 * Troca o tema (e salva a escolha). Com `origin`, o tema novo aparece como um
 * círculo que nasce nesse ponto e cobre a tela.
 */
export function setTheme(preference: ThemePreference, origin?: ThemeChangeOrigin): void {
  saveThemePreference(preference);
  const next = resolveTheme(preference);
  if (next === currentTheme()) return;

  if (!canAnimateThemeChange()) {
    applyTheme(next);
    return;
  }

  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? window.innerHeight / 2;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  const transition = document.startViewTransition(() => applyTheme(next));
  transition.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: REVEAL_DURATION_MS, easing: revealEasing(), pseudoElement: "::view-transition-new(root)" }
      );
    })
    .catch(() => {
      // Transição abortada (outra navegação): o tema já foi aplicado.
    });
}
