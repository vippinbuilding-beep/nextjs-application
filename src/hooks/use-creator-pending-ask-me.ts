"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { subscribeToCreatorAskMeChanges } from "@/lib/ask-me/realtime";
import { askMeQuestionRepository } from "@/services/repository-factory";

export function useCreatorPendingAskMe(creatorId: string | undefined): number {
  const [count, setCount] = useState(0);

  const load = useCallback(async (id: string) => {
    try {
      const value =
        await askMeQuestionRepository.countAwaitingResponseByCreator(id);
      setCount(value);
    } catch {
      setCount(0);
    }
  }, []);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (!creatorId) {
      setCount(0);
      return;
    }

    const stableCreatorId = creatorId;
    void loadRef.current(stableCreatorId);

    const unsubscribeRealtime = subscribeToCreatorAskMeChanges(
      stableCreatorId,
      () => {
        void loadRef.current(stableCreatorId);
      }
    );

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void loadRef.current(stableCreatorId);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      unsubscribeRealtime();
    };
  }, [creatorId]);

  return count;
}
