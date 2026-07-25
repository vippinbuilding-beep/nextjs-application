"use client";

import { useEffect } from "react";

import { getVisitorId, hasVisited, markVisited } from "@/lib/visits/visitor-id";

interface VisitTrackerProps {
  /** What is being visited. */
  scope: "creator" | "product";
  /** The creator id (scope "creator") or product id (scope "product"). */
  targetId: string;
  /** When true, this is the owner viewing their own page — never count it. */
  disabled?: boolean;
}

const ENDPOINT: Record<VisitTrackerProps["scope"], (id: string) => string> = {
  creator: (id) => `/api/creators/${id}/visit`,
  product: (id) => `/api/products/${id}/visit`,
};

/**
 * Fire-and-forget client component that records an exact visit for the current
 * page. Renders nothing. It runs once per browser per target: it reads (or
 * creates) a stable visitor id in localStorage, skips if this browser already
 * counted this target, and otherwise POSTs to the visit route. The server
 * deduplicates by `(target, visitor_id)`, so a visit is counted at most once
 * per browser even if this check is bypassed.
 */
export function VisitTracker({ scope, targetId, disabled }: VisitTrackerProps) {
  useEffect(() => {
    if (disabled || !targetId) return;
    if (hasVisited(scope, targetId)) return;

    const visitorId = getVisitorId();
    if (!visitorId) return;

    let cancelled = false;

    fetch(ENDPOINT[scope](targetId), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ visitorId }),
      keepalive: true,
    })
      .then((response) => {
        if (!cancelled && response.ok) markVisited(scope, targetId);
      })
      .catch(() => {
        // Silencioso: contagem de visita nunca deve atrapalhar a página.
      });

    return () => {
      cancelled = true;
    };
  }, [scope, targetId, disabled]);

  return null;
}
