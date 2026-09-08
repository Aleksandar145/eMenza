"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  readCounterQueueState,
  subscribeCounterQueue,
  writeCounterQueueState,
} from "@/lib/counter-queue-store";
import {
  fetchCounterQueueFromApi,
  patchCounterQueueClearManual,
  patchCounterQueueManualLevel,
  postCounterQueueLookup,
  shouldUseCounterQueueApi,
  type CounterQueueApiSnapshot,
} from "@/lib/backend/counter-queue-api";
import {
  QUEUE_TICK_MS,
  createManualOverride,
  getEffectiveQueueLevel,
  recordLookupTimestamp,
  type KitchenCounterManualOverride,
  type KitchenCounterQueueLevel,
} from "@/lib/kitchen-counter-queue";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function applyApiSnapshot(snapshot: CounterQueueApiSnapshot) {
  writeCounterQueueState({
    timestamps: snapshot.timestamps ?? [],
    manualOverride: snapshot.manualOverride ?? null,
  });
}

function loadInitialState() {
  if (typeof window === "undefined") {
    return { timestamps: [] as number[], manualOverride: null as KitchenCounterManualOverride | null };
  }

  const stored = readCounterQueueState();
  return {
    timestamps: stored.timestamps,
    manualOverride: stored.manualOverride,
  };
}

export function useKitchenCounterQueue() {
  const initial = loadInitialState();
  const [timestamps, setTimestamps] = useState<number[]>(initial.timestamps);
  const [manualOverride, setManualOverride] = useState<KitchenCounterManualOverride | null>(
    initial.manualOverride,
  );
  const [now, setNow] = useState(() => Date.now());

  const persistState = useCallback(
    (nextTimestamps: number[], nextManualOverride: KitchenCounterManualOverride | null) => {
      writeCounterQueueState({
        timestamps: nextTimestamps,
        manualOverride: nextManualOverride,
      });
    },
    [],
  );

  const applyRemoteSnapshot = useCallback((snapshot: CounterQueueApiSnapshot) => {
    const nextTimestamps = snapshot.timestamps ?? [];
    const nextManualOverride = snapshot.manualOverride ?? null;
    setTimestamps(nextTimestamps);
    setManualOverride(nextManualOverride);
    persistState(nextTimestamps, nextManualOverride);
  }, [persistState]);

  useEffect(() => {
    return subscribeCounterQueue(() => {
      const stored = readCounterQueueState();
      setTimestamps(stored.timestamps);
      setManualOverride(stored.manualOverride);
    });
  }, []);

  useEffect(() => {
    if (!shouldUseCounterQueueApi()) {
      return;
    }

    let cancelled = false;

    async function syncFromApi() {
      try {
        const snapshot = await fetchCounterQueueFromApi();
        if (!cancelled) {
          applyRemoteSnapshot(snapshot);
        }
      } catch {
        // Keep local/demo state when API is unavailable.
      }
    }

    void syncFromApi();
    const timer = window.setInterval(() => {
      void syncFromApi();
      setNow(Date.now());
    }, QUEUE_TICK_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [applyRemoteSnapshot]);

  useEffect(() => {
    if (shouldUseCounterQueueApi()) {
      return;
    }

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, QUEUE_TICK_MS);

    return () => window.clearInterval(timer);
  }, []);

  const snapshot = useMemo(
    () => getEffectiveQueueLevel(timestamps, manualOverride, now),
    [manualOverride, now, timestamps],
  );

  const recordLookupAttempt = useCallback(() => {
    const nextNow = Date.now();
    const nextTimestamps = recordLookupTimestamp(timestamps, nextNow);
    setTimestamps(nextTimestamps);
    setNow(nextNow);
    persistState(nextTimestamps, manualOverride);

    if (shouldUseCounterQueueApi()) {
      void postCounterQueueLookup()
        .then(applyRemoteSnapshot)
        .catch(() => undefined);
    }
  }, [applyRemoteSnapshot, manualOverride, persistState, timestamps]);

  const setManualLevel = useCallback(
    (level: KitchenCounterQueueLevel) => {
      const nextNow = Date.now();
      const nextManualOverride = createManualOverride(level, nextNow);
      setManualOverride(nextManualOverride);
      setNow(nextNow);
      persistState(timestamps, nextManualOverride);

      if (shouldUseCounterQueueApi()) {
        void patchCounterQueueManualLevel(level)
          .then(applyRemoteSnapshot)
          .catch(() => undefined);
      }
    },
    [applyRemoteSnapshot, persistState, timestamps],
  );

  const clearManualOverride = useCallback(() => {
    const nextNow = Date.now();
    setManualOverride(null);
    setNow(nextNow);
    persistState(timestamps, null);

    if (shouldUseCounterQueueApi()) {
      void patchCounterQueueClearManual()
        .then(applyRemoteSnapshot)
        .catch(() => undefined);
    }
  }, [applyRemoteSnapshot, persistState, timestamps]);

  return {
    level: snapshot.level,
    source: snapshot.source,
    countLastMinute: snapshot.count,
    manualExpiresAt: snapshot.manualOverride?.expiresAt ?? null,
    recordLookupAttempt,
    setManualLevel,
    clearManualOverride,
  };
}

export default useKitchenCounterQueue;
