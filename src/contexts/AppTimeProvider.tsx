"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  clearAppTimeOverride,
  getAppDateKey,
  getAppNow,
  getAppNowWithoutSessionOverride,
  isAppTimeOverridden,
  setAppTimeOverride,
  subscribeAppTime,
} from "@/lib/date-utils";

type AppTimeContextValue = {
  now: Date;
  dateKey: string;
  isOverridden: boolean;
  setDateTime: (date: Date) => void;
  resetToRealTime: () => void;
};

const AppTimeContext = createContext<AppTimeContextValue | null>(null);

type AppTimeStoreSnapshot = {
  tick: number;
  isOverridden: boolean;
};

let clientSnapshot: AppTimeStoreSnapshot = { tick: 0, isOverridden: false };
let serverSnapshot: AppTimeStoreSnapshot | null = null;

function subscribeToAppTimeTicks(onStoreChange: () => void) {
  const intervalId = window.setInterval(onStoreChange, 1000);
  const unsubscribe = subscribeAppTime(onStoreChange);
  return () => {
    window.clearInterval(intervalId);
    unsubscribe();
  };
}

function readClientAppTimeSnapshot(): AppTimeStoreSnapshot {
  const tick = Math.floor(getAppNow().getTime() / 1000);
  const isOverridden = isAppTimeOverridden();

  if (clientSnapshot.tick === tick && clientSnapshot.isOverridden === isOverridden) {
    return clientSnapshot;
  }

  clientSnapshot = { tick, isOverridden };
  return clientSnapshot;
}

function readServerAppTimeSnapshot(): AppTimeStoreSnapshot {
  if (serverSnapshot) {
    return serverSnapshot;
  }

  const now = getAppNowWithoutSessionOverride();
  serverSnapshot = {
    tick: Math.floor(now.getTime() / 1000),
    isOverridden: isAppTimeOverridden(),
  };
  return serverSnapshot;
}

export function AppTimeProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(
    subscribeToAppTimeTicks,
    readClientAppTimeSnapshot,
    readServerAppTimeSnapshot,
  );
  const now = useMemo(() => new Date(snapshot.tick * 1000), [snapshot.tick]);
  const dateKey = getAppDateKey(now);

  const setDateTime = useCallback((date: Date) => {
    setAppTimeOverride(date);
  }, []);

  const resetToRealTime = useCallback(() => {
    clearAppTimeOverride();
  }, []);

  const value = useMemo(
    (): AppTimeContextValue => ({
      now,
      dateKey,
      isOverridden: snapshot.isOverridden,
      setDateTime,
      resetToRealTime,
    }),
    [now, dateKey, snapshot.isOverridden, setDateTime, resetToRealTime],
  );

  return <AppTimeContext.Provider value={value}>{children}</AppTimeContext.Provider>;
}

export function useAppTime() {
  const context = useContext(AppTimeContext);
  if (!context) {
    throw new Error("useAppTime must be used within AppTimeProvider");
  }
  return context;
}

export function useTodayDateKey() {
  return useAppTime().dateKey;
}
