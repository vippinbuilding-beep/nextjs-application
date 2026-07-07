/** Starts the consumer → creator conversion (server validates role). */
export async function requestBecomeCreator(): Promise<void> {
  const response = await fetch("/api/profile/become-creator", {
    method: "POST",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(body?.error ?? "Não foi possível virar criador.");
  }
}
