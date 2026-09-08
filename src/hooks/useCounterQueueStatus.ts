"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getWorkingHours } from "@/lib/admin-system-store";
import {
  readCounterQueueState,
  subscribeCounterQueue,
} from "@/lib/counter-queue-store";
import {
  fetchCounterQueueFromApi,
  shouldUseCounterQueueApi,
  type CounterQueueApiSnapshot,
} from "@/lib/backend/counter-queue-api";
import { getAppNow } from "@/lib/date-utils";
import {
  QUEUE_TICK_MS,
  getEffectiveQueueLevel,
  getQueueLevelConfig,
  type KitchenCounterQueueLevel,
} from "@/lib/kitchen-counter-queue";
import { isReservationActiveForPickup } from "@/lib/meal-reservation-status";
import type { MealType } from "@/lib/meal-types";

type UseCounterQueueStatusOptions = {
  dateKey?: string;
  mealType?: MealType;
};

export function useCounterQueueStatus(options: UseCounterQueueStatusOptions = {}) {
  const { dateKey, mealType } = options;
  const [timestamps, setTimestamps] = useState<number[]>([]);
  const [manualOverride, setManualOverride] = useState(
    () => readCounterQueueState().manualOverride,
  );
  const [now, setNow] = useState(() => Date.now());
  const workingHours = getWorkingHours();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const appNow = useMemo(() => getAppNow(), [now]);

  const syncFromStorage = useCallback(() => {
    const stored = readCounterQueueState();
    setTimestamps(stored.timestamps);
    setManualOverride(stored.manualOverride);
  }, []);

  const applyRemoteSnapshot = useCallback((snapshot: CounterQueueApiSnapshot) => {
    setTimestamps(snapshot.timestamps ?? []);
    setManualOverride(snapshot.manualOverride ?? null);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    syncFromStorage();
    return subscribeCounterQueue(syncFromStorage);
  }, [syncFromStorage]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, QUEUE_TICK_MS);

    return () => window.clearInterval(timer);
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
        // Fall back to localStorage snapshot.
      }
    }

    void syncFromApi();
    const timer = window.setInterval(() => {
      void syncFromApi();
    }, QUEUE_TICK_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [applyRemoteSnapshot]);

  const snapshot = useMemo(
    () => getEffectiveQueueLevel(timestamps, manualOverride, now),
    [manualOverride, now, timestamps],
  );

  const level = snapshot.level;
  const label = getQueueLevelConfig(level).label;
  const isVisible =
    dateKey && mealType
      ? isReservationActiveForPickup(dateKey, mealType, workingHours, appNow)
      : false;
  return {
    level,
    label,
    source: snapshot.source,
    countLastMinute: snapshot.count,
    isVisible,
  };
}

export type CounterQueueStatus = {
  level: KitchenCounterQueueLevel;
  label: string;
  isVisible: boolean;
};

export default useCounterQueueStatus;
