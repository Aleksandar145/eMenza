"use client";

import { useMemo } from "react";
import { useMealReservations } from "@/hooks/useMealReservations";
import { getPlanningWeekDays, getDayReservationSummary, type PlanningWeekDay } from "@/lib/dashboard-mock";
import {
  getDayReservationSummaryFromReservations,
  getReservedMealTypesForDate,
} from "@/lib/reservations-view";

export function usePlanningWeekDays(count: number, startDateKey?: string) {
  const { reservations, usesBackend } = useMealReservations();

  const days = useMemo((): PlanningWeekDay[] => {
    const baseDays = getPlanningWeekDays(count, startDateKey);

    if (!usesBackend) {
      return baseDays;
    }

    return baseDays.map((day) => ({
      ...day,
      meals: getReservedMealTypesForDate(day.dateKey, reservations),
    }));
  }, [count, startDateKey, reservations, usesBackend]);

  function getDaySummary(dateKey: string) {
    if (!usesBackend) {
      return getDayReservationSummary(dateKey);
    }

    return getDayReservationSummaryFromReservations(dateKey, reservations);
  }

  return {
    days,
    getDaySummary,
    usesBackend,
  };
}
