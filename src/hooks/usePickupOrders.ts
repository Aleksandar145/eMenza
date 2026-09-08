"use client";

import { useMemo } from "react";
import { useMealReservations } from "@/hooks/useMealReservations";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { useCardAccess } from "@/components/shared/CardAccessProvider";
import { isClientBackendEnabled } from "@/lib/backend-config";
import {
  getPickupOrderForMeal,
  getPickupOrdersForUser,
  type PickupOrder,
} from "@/lib/preuzimanje-mock";
import { reservationToPickupOrder } from "@/lib/reservations-view";
import { resolveEffectiveReservationStatus } from "@/lib/meal-reservation-status";
import { getWorkingHours } from "@/lib/admin-system-store";
import { getAppNow } from "@/lib/date-utils";
import { useStudentSession } from "@/hooks/useStudentSession";

export function usePickupOrders() {
  const backend = isClientBackendEnabled();
  const { isAuthenticated, isDemo } = useStudentSession();
  const useRemote = backend && isAuthenticated && !isDemo;
  const { reservations, isLoaded: reservationsLoaded } = useMealReservations();
  const profile = useStudentProfile();
  const { snapshot } = useCardAccess();

  const remoteOrders = useMemo((): PickupOrder[] => {
    if (!useRemote) {
      return [];
    }

    return reservations
      .filter(
        (reservation) =>
          resolveEffectiveReservationStatus(
            reservation.dateKey,
            reservation.mealType,
            reservation.status,
            getWorkingHours(),
            getAppNow(),
          ) === "aktivno",
      )
      .map((reservation) =>
        reservationToPickupOrder(reservation, {
          studentName: profile.displayName,
          cardId: snapshot.cardId,
          cardDisplayNumber: snapshot.maskedNumber,
        }),
      );
  }, [profile.displayName, reservations, snapshot.cardId, snapshot.maskedNumber, useRemote]);

  const orders = useRemote ? remoteOrders : getPickupOrdersForUser();
  const isLoaded = useRemote ? reservationsLoaded : true;

  function getOrderForMeal(dateKey: string, mealType: Parameters<typeof getPickupOrderForMeal>[1]) {
    if (useRemote) {
      return (
        remoteOrders.find(
          (order) => order.dateKey === dateKey && order.mealType === mealType,
        ) ?? null
      );
    }

    return getPickupOrderForMeal(dateKey, mealType);
  }

  return {
    orders: orders.filter((order) => order.status === "spremno"),
    getOrderForMeal,
    isLoaded,
    usesRemote: useRemote,
  };
}
