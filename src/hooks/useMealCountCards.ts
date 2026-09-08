"use client";

import { useMemo } from "react";
import { useAppTime, useTodayDateKey } from "@/contexts/AppTimeProvider";
import { useMealReservations } from "@/hooks/useMealReservations";
import { getWorkingHours } from "@/lib/admin-system-store";
import { getAllStudentMealReservations, mealCountCards } from "@/lib/dashboard-mock";
import { countUpcomingReservationsByMealType } from "@/lib/reservations-view";

export function useMealCountCards() {
  const todayDateKey = useTodayDateKey();
  const { now } = useAppTime();
  const { reservations, usesBackend } = useMealReservations();
  const workingHours = getWorkingHours();

  return useMemo(() => {
    const source = usesBackend ? reservations : getAllStudentMealReservations();

    return mealCountCards.map((card) => ({
      ...card,
      count: countUpcomingReservationsByMealType(
        source,
        card.type,
        todayDateKey,
        workingHours,
        now,
      ),
    }));
  }, [now, reservations, todayDateKey, usesBackend, workingHours]);
}
