"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createInitialDishCatalogState, type DishCatalogState } from "@/lib/dish-catalog-mock";
import {
  hydrateDishCatalogFromCache,
  loadDishCatalogState,
  resetCatalogSync,
  subscribeDishCatalog,
  syncDishCatalogFromApi,
} from "@/lib/dish-catalog-store";

const SYNC_TIMEOUT_MS = 8_000;

export function useDishCatalog() {
  const [state, setState] = useState<DishCatalogState>(() => createInitialDishCatalogState());
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    hydrateDishCatalogFromCache({ notify: true });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(loadDishCatalogState());

    const unsubscribe = subscribeDishCatalog(() => {
      setState(loadDishCatalogState());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (state.dishes.length > 0) return;
    setSyncing(true);

    const syncTimer = setTimeout(() => {
      if (!mountedRef.current) return;
      resetCatalogSync();
      setSyncing(false);
      setSyncError("Server ne odgovara. Prikazani su keširani podaci.");
    }, SYNC_TIMEOUT_MS);

    void syncDishCatalogFromApi()
      .then((result) => {
        clearTimeout(syncTimer);
        if (!mountedRef.current) return;
        setSyncing(false);
        if (!result.ok) {
          setSyncError(result.error ?? "Greška pri učitavanju kataloga");
        } else {
          setSyncError(null);
        }
      })
      .catch(() => {
        clearTimeout(syncTimer);
        if (!mountedRef.current) return;
        setSyncing(false);
        setSyncError("Greška pri učitavanju kataloga");
      });

    return () => {
      clearTimeout(syncTimer);
    };
  }, [state.dishes]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(() => {
    setState(loadDishCatalogState());
  }, []);

  const retry = useCallback(() => {
    setSyncError(null);
    setSyncing(true);

    const syncTimer = setTimeout(() => {
      if (!mountedRef.current) return;
      resetCatalogSync();
      setSyncing(false);
      setSyncError("Server ne odgovara. Prikazani su keširani podaci.");
    }, SYNC_TIMEOUT_MS);

    void syncDishCatalogFromApi()
      .then((result) => {
        clearTimeout(syncTimer);
        if (!mountedRef.current) return;
        setSyncing(false);
        if (!result.ok) {
          setSyncError(result.error ?? "Greška pri učitavanju kataloga");
        } else {
          setSyncError(null);
        }
      })
      .catch(() => {
        clearTimeout(syncTimer);
        if (!mountedRef.current) return;
        setSyncing(false);
        setSyncError("Greška pri učitavanju kataloga");
      });
  }, []);

  const isEmpty = state.dishes.length === 0;

  return { state, syncing, syncError, isEmpty, refresh, retry };
}
