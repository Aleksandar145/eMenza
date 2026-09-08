"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import type { KuhinjaJelovnikState } from "@/lib/kuhinja-mock";
import {
  hydrateStudentMenuCaches,
  loadKuhinjaJelovnikState,
  subscribeKuhinjaJelovnik,
  syncKitchenJelovnikBootstrap,
} from "@/lib/kuhinja-jelovnik-store";

function readInitialJelovnikState(): KuhinjaJelovnikState {
  if (typeof window !== "undefined") {
    hydrateStudentMenuCaches({ notify: false });
  }

  return loadKuhinjaJelovnikState();
}

export function useKuhinjaJelovnik() {
  const [state, setState] = useState<KuhinjaJelovnikState>(readInitialJelovnikState);

  useLayoutEffect(() => {
    hydrateStudentMenuCaches({ notify: true });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(loadKuhinjaJelovnikState());
  }, []);

  useEffect(() => {
    void syncKitchenJelovnikBootstrap().then(() => {
      setState(loadKuhinjaJelovnikState());
    });

    return subscribeKuhinjaJelovnik(() => {
      setState(loadKuhinjaJelovnikState());
    });
  }, []);

  const refresh = useCallback(() => {
    setState(loadKuhinjaJelovnikState());
  }, []);

  return { state, refresh };
}
