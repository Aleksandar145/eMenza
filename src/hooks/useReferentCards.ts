"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadReferentCardsState,
  subscribeReferentCards,
  syncReferentCardsFromApi,
} from "@/lib/referent-cards-store";
import type { ReferentCardsState } from "@/lib/referent-cards-mock";

export function useReferentCards() {
  const [state, setState] = useState<ReferentCardsState>(() => loadReferentCardsState());

  useEffect(() => {
    void syncReferentCardsFromApi()
      .then(() => {
        setState(loadReferentCardsState());
      })
      .catch(() => {
        // API unavailable — keep locally cached state
      });

    return subscribeReferentCards(() => {
      setState(loadReferentCardsState());
    });
  }, []);

  const refresh = useCallback(() => {
    setState(loadReferentCardsState());
  }, []);

  return { state, refresh };
}
