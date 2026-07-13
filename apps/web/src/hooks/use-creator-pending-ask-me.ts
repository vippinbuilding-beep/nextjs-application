"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { subscribeToCreatorAskMeChanges } from "@/lib/ask-me/realtime";
import { subscribeAskMePendingCountRefresh } from "@/lib/ask-me/pending-count";
import { askMeQuestionRepository } from "@vippin/supabase/factories/repository-factory";

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

    const unsubscribeManualRefresh = subscribeAskMePendingCountRefresh(() => {
      void loadRef.current(stableCreatorId);
    });

    function handleVisible() {
      if (document.visibilityState === "visible") {
        void loadRef.current(stableCreatorId);
      }
    }

    document.addEventListener("visibilitychange", handleVisible);
    window.addEventListener("focus", handleVisible);

    return () => {
      unsubscribeRealtime();
      unsubscribeManualRefresh();
      document.removeEventListener("visibilitychange", handleVisible);
      window.removeEventListener("focus", handleVisible);
    };
  }, [creatorId]);

  return count;
}
