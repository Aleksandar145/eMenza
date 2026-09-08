"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createInitialMagacinState, type MagacinState } from "@/lib/magacin-mock";
import { shouldUseMagacinApi } from "@/lib/backend/magacin-api";
import {
  hydrateMagacinFromCache,
  loadMagacinState,
  resetMagacinSync,
  subscribeMagacin,
  syncMagacinFromApi,
} from "@/lib/magacin-store";

const SYNC_TIMEOUT_MS = 8_000;

export function useMagacin() {
  const [state, setState] = useState<MagacinState>(() => createInitialMagacinState());
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const didSyncOnce = useRef(false);

  useEffect(() => {
    hydrateMagacinFromCache({ notify: true });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(loadMagacinState());

    const unsubscribe = subscribeMagacin(() => {
      setState(loadMagacinState());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!shouldUseMagacinApi()) return;
    if (didSyncOnce.current) return;
    didSyncOnce.current = true;
    setSyncing(true);

    const syncTimer = setTimeout(() => {
      if (!mountedRef.current) return;
      resetMagacinSync();
      setSyncing(false);
      setSyncError("Server ne odgovara. Prikazani su keširani podaci.");
    }, SYNC_TIMEOUT_MS);

    void syncMagacinFromApi()
      .then((result) => {
        clearTimeout(syncTimer);
        if (!mountedRef.current) return;
        setSyncing(false);
        if (!result.ok) {
          setSyncError(result.error ?? "Greška pri učitavanju magacina");
        } else {
          setSyncError(null);
        }
      })
      .catch(() => {
        clearTimeout(syncTimer);
        if (!mountedRef.current) return;
        setSyncing(false);
        setSyncError("Greška pri učitavanju magacina");
      });

    return () => {
      clearTimeout(syncTimer);
    };
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(() => {
    setState(loadMagacinState());
  }, []);

  const retry = useCallback(() => {
    setSyncError(null);
    setSyncing(true);

    const syncTimer = setTimeout(() => {
      if (!mountedRef.current) return;
      resetMagacinSync();
      setSyncing(false);
      setSyncError("Server ne odgovara. Prikazani su keširani podaci.");
    }, SYNC_TIMEOUT_MS);

    void syncMagacinFromApi()
      .then((result) => {
        clearTimeout(syncTimer);
        if (!mountedRef.current) return;
        setSyncing(false);
        if (!result.ok) {
          setSyncError(result.error ?? "Greška pri učitavanju magacina");
        } else {
          setSyncError(null);
        }
      })
      .catch(() => {
        clearTimeout(syncTimer);
        if (!mountedRef.current) return;
        setSyncing(false);
        setSyncError("Greška pri učitavanju magacina");
      });
  }, []);

  const isEmpty = state.ingredients.length === 0;

  return { state, syncing, syncError, isEmpty, refresh, retry };
}
