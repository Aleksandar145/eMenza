"use client";

import { useEffect, useState } from "react";
import {
  getKitchenCounterNow,
  getKitchenMealClockState,
  type KitchenMealClockState,
} from "@/lib/kitchen-meal-clock";

export function useKitchenMealClock(dateKey: string) {
  const [clock, setClock] = useState<KitchenMealClockState>(() =>
    getKitchenMealClockState(dateKey, getKitchenCounterNow()),
  );

  useEffect(() => {
    function tick() {
      setClock(getKitchenMealClockState(dateKey, getKitchenCounterNow()));
    }

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [dateKey]);

  return clock;
}
