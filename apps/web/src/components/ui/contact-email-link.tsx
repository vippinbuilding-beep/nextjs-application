import { Mail } from "lucide-react";

import { cn } from "@vippin/ui/lib/utils";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

interface ContactEmailLinkProps {
  className?: string;
}

/** Discreet "Fale conosco" mailto link. Renders nothing if unconfigured. */
export function ContactEmailLink({ className }: ContactEmailLinkProps) {
  if (!CONTACT_EMAIL) return null;

  return (
    <a
      href={`mailto:${CONTACT_EMAIL}`}
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
        className
      )}
    >
      <Mail className="size-3.5" />
      Fale conosco
    </a>
  );
}
