"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  hydrateWeeklyScheduleFromStorage,
  loadWeeklySchedule,
  saveWeeklySchedule,
  subscribeWeeklySchedule,
} from "@/lib/kuhinja-weekly-schedule-store";
import type { WeeklySchedule } from "@/lib/kuhinja-weekly-schedule";

function readInitialSchedule(weekStartDateKey: string): WeeklySchedule | null {
  if (typeof window !== "undefined") {
    hydrateWeeklyScheduleFromStorage({ notify: false });
  }

  return loadWeeklySchedule(weekStartDateKey);
}

export function useWeeklySchedule(weekStartDateKey: string) {
  const [schedule, setScheduleState] = useState<WeeklySchedule | null>(() =>
    readInitialSchedule(weekStartDateKey),
  );

  useLayoutEffect(() => {
    hydrateWeeklyScheduleFromStorage({ notify: true });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScheduleState(loadWeeklySchedule(weekStartDateKey));
  }, [weekStartDateKey]);

  useEffect(() => {
    return subscribeWeeklySchedule(() => {
      setScheduleState(loadWeeklySchedule(weekStartDateKey));
    });
  }, [weekStartDateKey]);

  const setSchedule = useCallback(
    (next: WeeklySchedule | null | ((current: WeeklySchedule | null) => WeeklySchedule | null)) => {
      setScheduleState((current) => {
        const resolved = typeof next === "function" ? next(current) : next;
        if (resolved) {
          saveWeeklySchedule(resolved);
        }
        return resolved;
      });
    },
    [],
  );

  return { schedule, setSchedule };
}
