import { Heart, Rocket, type LucideIcon } from "lucide-react";

import type { AuthRole } from "@/lib/auth/login-url";

export const LOGIN_ROLE_COPY: Record<
  AuthRole,
  { icon: LucideIcon; badge: string; description: string; action: string }
> = {
  creator: {
    icon: Rocket,
    badge: "Perfil de criador",
    description:
      "Monte sua vitrine, publique aulas e comece a vender seu conhecimento.",
    action: "Entrar como criador",
  },
  consumer: {
    icon: Heart,
    badge: "Perfil de consumidor",
    description:
      "Acesse aulas e materiais dos criadores que você admira.",
    action: "Entrar como consumidor",
  },
};
