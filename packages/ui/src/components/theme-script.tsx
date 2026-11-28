import { THEME_INIT_SCRIPT } from "../lib/theme";

/**
 * Vai no <head> do layout raiz: aplica o tema salvo antes da primeira pintura,
 * sem o "piscar" branco ao abrir no escuro. O <html> precisa de
 * `suppressHydrationWarning`, porque este script muda a classe dele.
 */
function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
}

export { ThemeScript };
