/** Routes that render inside the creator dashboard shell (creator role only). */

const CREATOR_SHELL_PREFIXES = ["/painel", "/products", "/profile"];

export function isCreatorShellPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return CREATOR_SHELL_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function getCreatorModuleTitle(pathname: string): string {
  if (pathname === "/") return "Visão geral";
  if (pathname.startsWith("/painel/desempenho")) return "Desempenho";
  if (pathname.startsWith("/painel/produtos")) return "Produtos";
  if (pathname.startsWith("/painel/financeiro")) return "Financeiro";
  if (pathname.startsWith("/painel/biblioteca")) return "Biblioteca";
  if (pathname.startsWith("/painel/minhas-perguntas")) return "Minhas perguntas";
  if (pathname.startsWith("/profile/ask-me")) return "Me pergunte";
  if (pathname.startsWith("/profile/links")) return "Links";
  if (pathname.startsWith("/profile/edit")) return "Perfil";
  if (pathname.startsWith("/products/new")) return "Novo produto";
  if (pathname.match(/^\/products\/[^/]+\/edit/)) return "Editar produto";
  return "Painel";
}
