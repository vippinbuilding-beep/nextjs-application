import Image from "next/image";

import { hasProfileAvatar } from "@/lib/profile";
import { getProfileAvatarUrl } from "@/lib/supabase/storage";
import { cn } from "@vippin/ui/lib/utils";

export type UserAvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_STYLES: Record<
  UserAvatarSize,
  { box: string; text: string; sizes: string }
> = {
  xs: { box: "size-6", text: "text-[10px]", sizes: "24px" },
  sm: { box: "size-8", text: "text-xs", sizes: "32px" },
  md: { box: "size-10", text: "text-sm", sizes: "40px" },
  lg: { box: "size-14", text: "text-lg", sizes: "56px" },
  xl: { box: "size-20", text: "text-3xl", sizes: "80px" },
};

export interface UserAvatarProps {
  userId: string;
  name: string;
  avatarPath?: string | null;
  avatarUrl?: string | null;
  /** Overrides the resolved profile image (e.g. local preview in the picker). */
  src?: string | null;
  size?: UserAvatarSize;
  className?: string;
  imageClassName?: string;
  sizes?: string;
}

function shouldUseNextImage(url: string): boolean {
  // API routes are dynamic and may require session cookies — bypass the optimizer.
  return url.startsWith("/") && !url.startsWith("/api/");
}

/**
 * Circular user avatar with a tight cartoon shadow (black offset sits close to
 * the circle). Used for the current user and other profiles across the app.
 */
export function UserAvatar({
  userId,
  name,
  avatarPath,
  avatarUrl,
  src,
  size = "md",
  className,
  imageClassName,
  sizes,
}: UserAvatarProps) {
  const preset = SIZE_STYLES[size];
  const initial = name.charAt(0).toUpperCase() || "?";
  const hasAvatar = Boolean(src) || hasProfileAvatar({ avatarPath, avatarUrl });
  const resolvedSrc =
    src ??
    (hasProfileAvatar({ avatarPath, avatarUrl })
      ? getProfileAvatarUrl(userId, avatarPath ?? avatarUrl)
      : null);
  const imageSizes = sizes ?? preset.sizes;

  return (
    <span
      className={cn("relative inline-flex shrink-0", preset.box, className)}
    >
      <span
        aria-hidden
        className="absolute inset-0 translate-x-px translate-y-px rounded-full bg-border"
      />
      <span
        className={cn(
          "relative flex size-full items-center justify-center overflow-hidden rounded-full border-2 border-border bg-chart-4 font-bold text-background",
          preset.text
        )}
      >
        {hasAvatar && resolvedSrc ? (
          shouldUseNextImage(resolvedSrc) ? (
            <Image
              src={resolvedSrc}
              alt=""
              fill
              sizes={imageSizes}
              className={cn("object-cover", imageClassName)}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolvedSrc}
              alt=""
              className={cn("size-full object-cover", imageClassName)}
            />
          )
        ) : (
          <span aria-hidden>{initial}</span>
        )}
      </span>
    </span>
  );
}
