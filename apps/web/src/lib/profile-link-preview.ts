import "server-only";

import { detectProfileLinkPlatform } from "@/lib/profile-link-platforms";
import { normalizeProfileLinkUrl } from "@vippin/core/domain/profile-links";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept-Language": "pt-BR,en;q=0.9",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
} as const;

const INSTAGRAM_WEB_APP_ID = "936619743392459";

const PREVIEW_FETCH_TIMEOUT_MS = 8_000;

function decodeHtmlEntitiesInUrl(value: string): string {
  return value
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PREVIEW_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function extractMetaContent(html: string, property: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
      "i"
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtmlEntitiesInUrl(match[1]);
  }

  return null;
}

function extractYouTubeAvatar(html: string): string | null {
  const patterns = [
    /"avatar":\{"thumbnails":\[\{"url":"([^"]+)"/,
    /"channelAvatarRenderer":\{"thumbnails":\[\{"url":"([^"]+)"/,
    /"avatar":\{"thumbnails":\[\{[^}]*"url":"([^"]+)"/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const url = decodeHtmlEntitiesInUrl(match[1]);
      if (isHttpsUrl(url)) return url;
    }
  }

  return null;
}

function normalizeYouTubeChannelUrl(url: URL): string {
  const path = url.pathname.replace(/\/+$/, "");

  if (path.startsWith("/@") || path.startsWith("/channel/") || path.startsWith("/c/")) {
    return `https://www.youtube.com${path}`;
  }

  return url.toString();
}

async function resolveYouTubeProfileImage(url: URL): Promise<string | null> {
  const channelUrl = normalizeYouTubeChannelUrl(url);
  const html = await fetchHtml(channelUrl);
  if (!html) return null;
  return extractYouTubeAvatar(html);
}

function extractInstagramUsername(url: URL): string | null {
  const [first, second] = url.pathname.split("/").filter(Boolean);
  if (!first) return null;

  const blocked = new Set([
    "p",
    "reel",
    "reels",
    "stories",
    "explore",
    "accounts",
    "direct",
    "tv",
  ]);
  if (blocked.has(first)) return null;
  if (first === "profile" && second) return second;

  return first;
}

async function resolveInstagramProfileImage(url: URL): Promise<string | null> {
  const username = extractInstagramUsername(url);
  if (!username) return null;

  const profileUrl = `https://www.instagram.com/${username}/`;

  const fromApi = await resolveInstagramProfileImageViaApi(username, profileUrl);
  if (fromApi) return fromApi;

  const html = await fetchHtml(profileUrl);
  if (!html) return null;

  const candidates = [
    extractMetaContent(html, "og:image"),
    html.match(/"profile_pic_url_hd":"([^"]+)"/)?.[1] ?? null,
    html.match(/"profile_pic_url":"([^"]+)"/)?.[1] ?? null,
    html.match(/profile_pic_url_hd\\":\\"([^\\"]+)/)?.[1] ?? null,
    html.match(/profile_pic_url\\":\\"([^\\"]+)/)?.[1] ?? null,
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    const image = decodeHtmlEntitiesInUrl(raw);
    if (isHttpsUrl(image)) return image;
  }

  return null;
}

async function resolveInstagramProfileImageViaApi(
  username: string,
  profileUrl: string
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PREVIEW_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
      {
        headers: {
          ...FETCH_HEADERS,
          Accept: "*/*",
          "X-IG-App-ID": INSTAGRAM_WEB_APP_ID,
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          Referer: profileUrl,
        },
        signal: controller.signal,
        redirect: "follow",
        cache: "no-store",
      }
    );
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      data?: {
        user?: {
          profile_pic_url_hd?: string;
          profile_pic_url?: string;
        };
      };
    };

    const candidates = [
      payload.data?.user?.profile_pic_url_hd,
      payload.data?.user?.profile_pic_url,
    ];

    for (const raw of candidates) {
      if (!raw) continue;
      const image = decodeHtmlEntitiesInUrl(raw);
      if (isHttpsUrl(image)) return image;
    }

    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function extractGithubUsername(url: URL): string | null {
  const [username] = url.pathname.split("/").filter(Boolean);
  if (!username) return null;

  const blocked = new Set([
    "settings",
    "notifications",
    "marketplace",
    "sponsors",
    "login",
    "signup",
    "orgs",
    "organizations",
  ]);
  if (blocked.has(username)) return null;

  return username;
}

async function resolveGithubProfileImage(url: URL): Promise<string | null> {
  const username = extractGithubUsername(url);
  if (!username) return null;
  return `https://github.com/${username}.png`;
}

function extractTwitterUsername(url: URL): string | null {
  const [username] = url.pathname.split("/").filter(Boolean);
  if (!username) return null;

  const blocked = new Set(["home", "search", "explore", "notifications", "messages", "i"]);
  if (blocked.has(username)) return null;

  return username;
}

async function resolveTwitterProfileImage(url: URL): Promise<string | null> {
  const username = extractTwitterUsername(url);
  if (!username) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PREVIEW_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://cdn.syndication.twimg.com/widgets/followbutton/info.json?screen_names=${encodeURIComponent(username)}`,
      { signal: controller.signal, cache: "no-store" }
    );
    if (!response.ok) return null;

    const data = (await response.json()) as Array<{
      profile_image_url_https?: string;
    }>;
    const image = data[0]?.profile_image_url_https;
    if (!image || !isHttpsUrl(image)) return null;

    return image.replace(/_normal(\.\w+)$/, "_400x400$1");
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function extractTikTokUsername(url: URL): string | null {
  const [first, username] = url.pathname.split("/").filter(Boolean);
  if (first !== "@" || !username) return null;
  return username.replace(/^@/, "");
}

async function resolveTikTokProfileImage(url: URL): Promise<string | null> {
  const username = extractTikTokUsername(url);
  if (!username) return null;

  const html = await fetchHtml(`https://www.tiktok.com/@${username}`);
  if (!html) return null;

  const patterns = [
    /"avatarLarger":"([^"]+)"/,
    /"avatarMedium":"([^"]+)"/,
    /"avatarThumb":"([^"]+)"/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const image = decodeHtmlEntitiesInUrl(match[1]);
      if (isHttpsUrl(image)) return image;
    }
  }

  const ogImage = extractMetaContent(html, "og:image");
  return ogImage && isHttpsUrl(ogImage) ? ogImage : null;
}

function extractTwitchUsername(url: URL): string | null {
  const [first] = url.pathname.split("/").filter(Boolean);
  if (!first) return null;

  const blocked = new Set(["videos", "directory", "downloads", "settings"]);
  if (blocked.has(first)) return null;

  return first;
}

async function resolveTwitchProfileImage(url: URL): Promise<string | null> {
  const username = extractTwitchUsername(url);
  if (!username) return null;

  const html = await fetchHtml(`https://www.twitch.tv/${username}`);
  if (!html) return null;

  const patterns = [
    /"profile_image_url":"([^"]+)"/,
    /"profileImageURL":"([^"]+)"/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const image = decodeHtmlEntitiesInUrl(match[1]);
      if (isHttpsUrl(image)) return image;
    }
  }

  return null;
}

export async function resolveProfileLinkPreviewImage(
  rawUrl: string
): Promise<string | null> {
  const normalized = normalizeProfileLinkUrl(rawUrl);
  if (!normalized) return null;

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return null;
  }

  const platform = detectProfileLinkPlatform(normalized);

  switch (platform?.id) {
    case "youtube":
      return resolveYouTubeProfileImage(parsed);
    case "instagram":
      return resolveInstagramProfileImage(parsed);
    case "github":
      return resolveGithubProfileImage(parsed);
    case "x":
      return resolveTwitterProfileImage(parsed);
    case "tiktok":
      return resolveTikTokProfileImage(parsed);
    case "twitch":
      return resolveTwitchProfileImage(parsed);
    default:
      return null;
  }
}
