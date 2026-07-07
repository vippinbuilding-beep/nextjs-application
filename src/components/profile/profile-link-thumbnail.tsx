"use client";

import { Link2 } from "lucide-react";
import { useEffect, useState } from "react";

import {
  detectProfileLinkPlatform,
  type ProfileLinkPlatformId,
} from "@/lib/profile-link-platforms";
import { getProfileLinkImageUrl } from "@/lib/supabase/storage";
import { cn } from "@/lib/utils";

interface ProfileLinkThumbnailProps {
  url: string;
  title?: string;
  linkId?: string;
  imagePath?: string | null;
  /** Temporary external preview while editing, before the image is stored. */
  livePreviewUrl?: string | null;
  size?: "sm" | "md";
  className?: string;
}

const SIZE_CLASSES = {
  sm: {
    box: "size-10",
    icon: "size-5",
    fallbackIcon: "size-4",
  },
  md: {
    box: "size-12",
    icon: "size-6",
    fallbackIcon: "size-5",
  },
} as const;

function PlatformGlyph({
  platformId,
  className,
}: {
  platformId: ProfileLinkPlatformId;
  className?: string;
}) {
  switch (platformId) {
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
          <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5.75-3.1a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Z" />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
          <path d="M21.6 7.2a2.8 2.8 0 0 0-2-2C17.9 4.6 12 4.6 12 4.6s-5.9 0-7.6.6a2.8 2.8 0 0 0-2 2A29 29 0 0 0 2 12a29 29 0 0 0 .4 4.8 2.8 2.8 0 0 0 2 2c1.7.6 7.6.6 7.6.6s5.9 0 7.6-.6a2.8 2.8 0 0 0 2-2 29 29 0 0 0 .4-4.8 29 29 0 0 0-.4-4.8ZM10 15.5v-7l6 3.5-6 3.5Z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
          <path d="M16.6 5.2c.8 1.1 2 1.9 3.4 2V10a6.8 6.8 0 0 1-3.4-.9v6.4a4.9 4.9 0 1 1-4.9-4.9c.2 0 .5 0 .7.1v2.4a2.5 2.5 0 1 0 1.8 2.4V2h2.4c.1 1.1.6 2.1 1.4 3.2Z" />
        </svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
          <path d="m4 4 7.2 9.6L4 20h2.2l5.4-6.8L16 20h6l-7.6-10.1L19.4 4H17.2l-5 6.3L8.2 4H4Z" />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
          <path d="M14 8.5V6.7c0-.8.2-1.2 1.1-1.2H16V3h-2.4C11.7 3 10 4.5 10 7.1V8.5H8v2.7h2V21h4v-9.8h2.7l.3-2.7H14Z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
          <path d="M6.5 8.7H3.4V21h3.1V8.7ZM5 3a1.8 1.8 0 1 0 0 3.6A1.8 1.8 0 0 0 5 3Zm4.2 5.7H6.1V21h3.1v-6c0-1.6.3-3.1 2.3-3.1 2 0 2 1.9 2 3.1V21H17v-6.6c0-3.2-.7-5.6-4.3-5.6-1.7 0-2.9.9-3.4 1.8h-.1V8.7Z" />
        </svg>
      );
    case "twitch":
      return (
        <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
          <path d="M4 3 2 7v14h5v3h3l3-3h4l6-6V3H4Zm14 10-3 3h-4l-3 3v-3H6V5h12v8Z" />
          <path d="M13 8h2v5h-2V8Zm4 0h2v5h-2V8Z" />
        </svg>
      );
    case "spotify":
      return (
        <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.5 14.4c-.2.3-.6.4-.9.2-2.5-1.5-5.6-1.8-9.3-1-.4.1-.7-.2-.8-.5s.2-.7.5-.8c4.1-.9 7.6-.5 10.5 1.2.3.2.4.6.2.9Zm1.5-3.3c-.2.4-.7.5-1 .3-2.9-1.7-7.2-2.2-10.6-1.2-.4.1-.9-.2-1-.6s.2-.9.6-1c4-1.1 8.8-.6 12.2 1.4.4.2.5.7.3 1.1Zm.2-3.5C14.2 8.2 8.6 8 5 9.2c-.5.2-1-.1-1.1-.6s.1-1 .6-1.2c4.1-1.3 10.3-1.1 14.2 1.4.5.3.6.9.3 1.3-.3.5-.9.6-1.4.3Z" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
          <path d="M12 2a10 10 0 0 0-8.7 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2Zm0 2a8 8 0 0 1 6.8 12.2l.2.3-.7 2.6-2.6.7-.3-.2A8 8 0 1 1 12 4Zm4.4 11.2c-.2-.4-1.2-.6-1.7-.6s-1 0-1.6.5-1.8 1.7-1.8 4.1 1.8 4.8 2 5.1 3.4 1.4 4.2 0 .3-.2.3-.5.5-1 .9-2.3.6-2.6 0-.3-2.1-1-2.4-1-.3 0-.5.1-.7.3s-.9 1-1.1 1.2-.4.2-.7.1a5.5 5.5 0 0 1-1.6-1 5.3 5.3 0 0 1-1-1.6c-.2-.3 0-.5.1-.7s.3-.3.4-.5a1 1 0 0 0 .1-.5c0-.2-.5-1.2-.6-1.6Z" />
        </svg>
      );
    case "telegram":
      return (
        <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
          <path d="m21.9 4.6-3.1 14.6c-.2.9-.7 1.1-1.4.7l-3.9-2.9-1.9 1.8c-.2.2-.4.4-.8.4l.3-4.2 7.2-6.5c.3-.3-.1-.4-.5-.2L7.2 13.5 3.3 12.2c-.9-.3-.9-.9.2-1.3l16.8-6.5c.7-.3 1.4.2 1.6 1.2Z" />
        </svg>
      );
    case "pinterest":
      return (
        <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
          <path d="M12 2a10 10 0 0 0-3.7 19.3c-.1-.8-.1-2 0-2.9.1-.9.7-3.7.7-3.7s-.2-.4-.2-1c0-.9.5-1.6 1.2-1.6.6 0 .8.4.8 1 0 .6-.4 1.5-.6 2.3-.2.9.4 1.6 1.2 1.6 1.5 0 2.5-1.9 2.5-4.1 0-1.7-1-3-2.9-3-2.2 0-3.5 1.7-3.5 3.5 0 .7.3 1.4.6 1.8.1.1.1.1 0 .3l-.2.8c0 .2-.2.3-.4.2-1.1-.5-1.8-2.1-1.8-3.4 0-2.8 2-5.4 5.8-5.4 3.1 0 5.4 2.2 5.4 5.2 0 3.1-1.9 5.5-4.6 5.5-.9 0-1.8-.5-2.1-1.1l-.6 2.2c-.2.7-.7 1.6-1 2.1A10 10 0 1 0 12 2Z" />
        </svg>
      );
    case "github":
      return (
        <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
          <path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.8c-3 .7-3.6-1.4-3.6-1.4-.5-1.2-1.2-1.5-1.2-1.5-1-.7.1-.7.1-.7 1.1.1 1.7 1.1 1.7 1.1 1 .1.7 1.7 2.5 1.2.1-.9.4-1.5.7-1.9-2.4-.3-4.9-1.2-4.9-5.4 0-1.2.4-2.2 1.1-3-.1-.3-.5-1.4.1-2.9 0 0 .9-.3 3 1.1a10.2 10.2 0 0 1 5.4 0c2.1-1.4 3-1.1 3-1.1.6 1.5.2 2.6.1 2.9.7.8 1.1 1.8 1.1 3 0 4.2-2.5 5.1-4.9 5.4.4.3.8 1 .8 2.1v3.1c0 .3.2.6.7.5A10 10 0 0 0 12 2Z" />
        </svg>
      );
    case "discord":
      return (
        <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
          <path d="M18.9 5.1A15.4 15.4 0 0 0 15 4l-.3.6a13.7 13.7 0 0 0-5.4 0L9 4a15.2 15.2 0 0 0-3.9 1.1C3.6 8.5 3 11.7 3.2 14.8a15.6 15.6 0 0 0 4.8 2.4l.8-1a10.5 10.5 0 0 1-1.6-.8l.4-.2a11.8 11.8 0 0 0 10.8 0l.4.2c-.5.3-1 .5-1.6.8l.8 1a15.5 15.5 0 0 0 4.8-2.4c.2-3.6-.6-6.8-2.2-9.7ZM9.7 13.6c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8Zm4.6 0c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8Z" />
        </svg>
      );
    case "threads":
      return (
        <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
          <path d="M12 2a9.7 9.7 0 0 0-3.4 18.8l.1-1.6c0-.5-.1-1.3-.4-1.9a6.4 6.4 0 0 1-.5-2.5c0-3.3 2.5-6.4 6.8-6.4 3.7 0 6.1 2.3 6.1 5.3 0 2.5-1 4.3-3.7 4.3-1.2 0-2-.6-1.7-1.3.3-.6.9-1.2 1.4-1.6-.8-.1-1.6-.4-2.3-.9-1.2 1.2-2.5 2.4-3.4 3.9-1.4 2.4-1.1 5.4 2.4 5.4 2.9 0 5.1-1.5 6.4-3.8A9.7 9.7 0 0 0 12 2Z" />
        </svg>
      );
    case "snapchat":
      return (
        <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
          <path d="M12 2c2.8 0 5 2.2 5 5.1 0 1.1-.4 2.1-1 2.9 2.2.5 4 1.6 4 3.5 0 1.1-.8 2-2 2.5 1.2.4 2 1.1 2 2 0 1.4-1.8 2.4-4.2 2.8l.8 1.6c.2.4 0 .9-.5 1.1-.4.2-.9 0-1.1-.4l-1-2c-1 .2-2.1.3-3.2.3s-2.2-.1-3.2-.3l-1 2c-.2.4-.7.6-1.1.4-.5-.2-.7-.7-.5-1.1l.8-1.6C6.8 18 5 17 5 15.6c0-.9.8-1.6 2-2-.9-.4-1.5-1-1.5-2 0-1.2 1.4-2.1 3.3-2.6-.7-.8-1.1-1.8-1.1-2.9C7.7 4.2 9.9 2 12 2Z" />
        </svg>
      );
    case "substack":
      return (
        <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
          <path d="M4 4h16v3H4V4Zm0 5h16v11H4V9Zm3 3v5h10v-5H7Z" />
        </svg>
      );
    case "website":
      return <Link2 className={className} aria-hidden />;
    default:
      return <Link2 className={className} aria-hidden />;
  }
}

function PlatformBrandThumbnail({
  url,
  title,
  size,
  className,
}: {
  url: string;
  title?: string;
  size: "sm" | "md";
  className?: string;
}) {
  const platform = detectProfileLinkPlatform(url);
  const sizeClasses = SIZE_CLASSES[size];

  if (!platform) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg border-2 border-border bg-muted text-foreground",
          sizeClasses.box,
          className
        )}
        aria-hidden
      >
        <Link2 className={sizeClasses.fallbackIcon} />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg border-2 border-border text-white shadow-cartoon-sm",
        platform.backgroundClass,
        sizeClasses.box,
        className
      )}
      title={title ?? platform.label}
      aria-hidden
    >
      <PlatformGlyph platformId={platform.id} className={sizeClasses.icon} />
    </span>
  );
}

export function ProfileLinkThumbnail({
  url,
  title,
  linkId,
  imagePath,
  livePreviewUrl,
  size = "md",
  className,
}: ProfileLinkThumbnailProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const sizeClasses = SIZE_CLASSES[size];
  const storedImageUrl =
    linkId && imagePath ? getProfileLinkImageUrl(linkId) : null;
  const profileImageUrl = storedImageUrl ?? livePreviewUrl ?? null;
  const showProfileImage = Boolean(profileImageUrl) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [profileImageUrl, url, imagePath, linkId]);

  if (showProfileImage) {
    return (
      <span
        className={cn(
          "relative shrink-0 overflow-hidden rounded-lg border-2 border-border bg-muted shadow-cartoon-sm",
          sizeClasses.box,
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={profileImageUrl!}
          alt={title ? `Ícone de ${title}` : ""}
          className="size-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      </span>
    );
  }

  return (
    <PlatformBrandThumbnail
      url={url}
      title={title}
      size={size}
      className={className}
    />
  );
}
