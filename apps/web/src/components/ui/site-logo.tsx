import Image from "next/image";

import { SITE_LOGO_PATH, SITE_NAME } from "@/lib/metadata";
import { cn } from "@vippin/ui/lib/utils";

interface SiteLogoProps {
  size?: number;
  className?: string;
  imageClassName?: string;
  showName?: boolean;
  nameClassName?: string;
  priority?: boolean;
}

export function SiteLogo({
  size = 32,
  className,
  imageClassName,
  showName = true,
  nameClassName,
  priority = false,
}: SiteLogoProps) {
  return (
    <span className={cn("inline-flex justify-center items-center gap-2 w-full", className)}>
      <Image
        src={SITE_LOGO_PATH}
        alt={SITE_NAME}
        width={size}
        height={size}
        priority={priority}
        className={cn("shrink-0 rounded-xl", imageClassName)}
      />
      {showName && (
        <span className={cn("font-bold tracking-tight", nameClassName)}>
          {SITE_NAME}
        </span>
      )}
    </span>
  );
}
