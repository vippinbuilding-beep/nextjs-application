import "server-only";

/**
 * Messages for the Vippin team, posted to Discord channels through incoming
 * webhooks. Each channel has its own webhook URL (a secret: anyone holding it
 * can post to the channel), so it stays server-only:
 *
 *   ops   → DISCORD_ALERT_WEBHOOK_URL  problemas que exigem ação (saldo, etiquetas)
 *   sales → DISCORD_SALES_WEBHOOK_URL  cada venda paga
 *
 * Never throws and never blocks for long: a message must not break the flow
 * that raised it. Without the env var the channel is off (local dev).
 */

export type DiscordChannel = "ops" | "sales";

const CHANNELS: Record<DiscordChannel, { env: string; username: string }> = {
  ops: { env: "DISCORD_ALERT_WEBHOOK_URL", username: "Vippin Alertas" },
  sales: { env: "DISCORD_SALES_WEBHOOK_URL", username: "Vippin Vendas" },
};

const TIMEOUT_MS = 5_000;
/** Discord rejects `content` longer than 2000 characters. */
const MAX_CONTENT_LENGTH = 2_000;

/** Subset of Discord's embed object we use (all limits enforced by Discord). */
export interface DiscordEmbed {
  title?: string;
  url?: string;
  description?: string;
  color?: number;
  author?: { name: string; url?: string; icon_url?: string };
  thumbnail?: { url: string };
  image?: { url: string };
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string; icon_url?: string };
  timestamp?: string;
}

export type DiscordMessage = string | { content?: string; embeds?: DiscordEmbed[] };

export async function sendDiscordMessage(
  channel: DiscordChannel,
  message: DiscordMessage
): Promise<boolean> {
  const { env, username } = CHANNELS[channel];
  const url = process.env[env];
  if (!url) return false;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        ...(typeof message === "string"
          ? { content: message.slice(0, MAX_CONTENT_LENGTH) }
          : {
              ...(message.content
                ? { content: message.content.slice(0, MAX_CONTENT_LENGTH) }
                : {}),
              embeds: message.embeds ?? [],
            }),
        // Text may carry user data (product titles, names): never ping
        // @everyone/@here or roles from it.
        allowed_mentions: { parse: [] },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(`[discord:${channel}] webhook failed:`, response.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error(
      `[discord:${channel}] webhook error:`,
      err instanceof Error ? err.message : err
    );
    return false;
  }
}

/** Problems only the team can fix. */
export function sendOpsAlert(content: string): Promise<boolean> {
  return sendDiscordMessage("ops", content);
}
