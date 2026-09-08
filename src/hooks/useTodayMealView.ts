"use client";

import { useMemo } from "react";
import { useAppTime } from "@/contexts/AppTimeProvider";
import { useMealReservations } from "@/hooks/useMealReservations";
import {
  getTodayPrimaryMealSection,
  resolvePrimaryMealSection,
  type TodayPrimaryMealSection,
} from "@/lib/dashboard-mock";
import { buildMealDetailsForDay } from "@/lib/reservations-view";

export function useTodayMealView(dateKey: string): TodayPrimaryMealSection & {
  isLoaded: boolean;
  usesBackend: boolean;
  isPending: boolean;
} {
  const { now } = useAppTime();
  const { reservations, isLoaded, usesBackend, isPending } = useMealReservations();

  const mockPrimary = useMemo(
    () => getTodayPrimaryMealSection(dateKey, now),
    [dateKey, now],
  );

  const apiPrimary = useMemo(() => {
    if (!usesBackend) {
      return null;
    }

    const day = buildMealDetailsForDay(dateKey, reservations);
    return resolvePrimaryMealSection(
      dateKey,
      day.sections,
      day.dateLabel,
      day.isReservationAvailable,
      now,
    );
  }, [dateKey, now, reservations, usesBackend]);
  const primary =
    usesBackend && isLoaded && apiPrimary ? apiPrimary : mockPrimary;

  return {
    ...primary,
    isLoaded: usesBackend ? isLoaded : true,
    usesBackend,
    isPending,
  };
}
