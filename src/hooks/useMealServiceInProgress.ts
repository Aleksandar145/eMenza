"use client";

import { useEffect, useState } from "react";
import { useTodayDateKey } from "@/contexts/AppTimeProvider";
import { getAppNow } from "@/lib/date-utils";
import { getKitchenMealClockState } from "@/lib/kitchen-meal-clock";

export function useMealServiceInProgress(dateKey?: string) {
  const todayDateKey = useTodayDateKey();
  const resolvedDateKey = dateKey ?? todayDateKey;
  const [clock, setClock] = useState(() =>
    getKitchenMealClockState(resolvedDateKey, getAppNow()),
  );

  useEffect(() => {
    function tick() {
      setClock(getKitchenMealClockState(resolvedDateKey, getAppNow()));
    }

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [resolvedDateKey]);

  return {
    isServing: clock.isServing,
    mealLabel: clock.mealLabel,
    mealType: clock.mealType,
  };
}

export default useMealServiceInProgress;
