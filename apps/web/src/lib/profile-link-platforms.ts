export type ProfileLinkPlatformId =
  | "instagram"
  | "youtube"
  | "tiktok"
  | "x"
  | "facebook"
  | "linkedin"
  | "twitch"
  | "spotify"
  | "whatsapp"
  | "telegram"
  | "pinterest"
  | "github"
  | "discord"
  | "threads"
  | "snapchat"
  | "substack"
  | "website";

export interface ProfileLinkPlatform {
  id: ProfileLinkPlatformId;
  label: string;
  backgroundClass: string;
  match: (hostname: string) => boolean;
}

function hostMatches(hostname: string, hosts: string[]): boolean {
  return hosts.some(
    (host) => hostname === host || hostname.endsWith(`.${host}`)
  );
}

const PLATFORMS: ProfileLinkPlatform[] = [
  {
    id: "instagram",
    label: "Instagram",
    backgroundClass:
      "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]",
    match: (hostname) => hostMatches(hostname, ["instagram.com", "instagr.am"]),
  },
  {
    id: "youtube",
    label: "YouTube",
    backgroundClass: "bg-[#ff0000]",
    match: (hostname) => hostMatches(hostname, ["youtube.com", "youtu.be"]),
  },
  {
    id: "tiktok",
    label: "TikTok",
    backgroundClass: "bg-[#010101]",
    match: (hostname) => hostMatches(hostname, ["tiktok.com"]),
  },
  {
    id: "x",
    label: "X",
    backgroundClass: "bg-[#000000]",
    match: (hostname) => hostMatches(hostname, ["x.com", "twitter.com"]),
  },
  {
    id: "facebook",
    label: "Facebook",
    backgroundClass: "bg-[#1877f2]",
    match: (hostname) =>
      hostMatches(hostname, ["facebook.com", "fb.com", "fb.me"]),
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    backgroundClass: "bg-[#0a66c2]",
    match: (hostname) => hostMatches(hostname, ["linkedin.com"]),
  },
  {
    id: "twitch",
    label: "Twitch",
    backgroundClass: "bg-[#9146ff]",
    match: (hostname) => hostMatches(hostname, ["twitch.tv"]),
  },
  {
    id: "spotify",
    label: "Spotify",
    backgroundClass: "bg-[#1db954]",
    match: (hostname) => hostMatches(hostname, ["spotify.com"]),
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    backgroundClass: "bg-[#25d366]",
    match: (hostname) =>
      hostMatches(hostname, ["whatsapp.com", "wa.me", "api.whatsapp.com"]),
  },
  {
    id: "telegram",
    label: "Telegram",
    backgroundClass: "bg-[#229ed9]",
    match: (hostname) => hostMatches(hostname, ["t.me", "telegram.me"]),
  },
  {
    id: "pinterest",
    label: "Pinterest",
    backgroundClass: "bg-[#e60023]",
    match: (hostname) => hostMatches(hostname, ["pinterest.com", "pin.it"]),
  },
  {
    id: "github",
    label: "GitHub",
    backgroundClass: "bg-[#24292f]",
    match: (hostname) => hostMatches(hostname, ["github.com"]),
  },
  {
    id: "discord",
    label: "Discord",
    backgroundClass: "bg-[#5865f2]",
    match: (hostname) => hostMatches(hostname, ["discord.com", "discord.gg"]),
  },
  {
    id: "threads",
    label: "Threads",
    backgroundClass: "bg-[#000000]",
    match: (hostname) => hostMatches(hostname, ["threads.net"]),
  },
  {
    id: "snapchat",
    label: "Snapchat",
    backgroundClass: "bg-[#fffc00] text-black",
    match: (hostname) => hostMatches(hostname, ["snapchat.com"]),
  },
  {
    id: "substack",
    label: "Substack",
    backgroundClass: "bg-[#ff6719]",
    match: (hostname) => hostMatches(hostname, ["substack.com"]),
  },
];

function normalizeHostname(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    return parsed.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

export function detectProfileLinkPlatform(url: string): ProfileLinkPlatform | null {
  const hostname = normalizeHostname(url);
  if (!hostname) return null;

  return PLATFORMS.find((platform) => platform.match(hostname)) ?? null;
}

export function suggestProfileLinkTitle(url: string): string | null {
  return detectProfileLinkPlatform(url)?.label ?? null;
}
