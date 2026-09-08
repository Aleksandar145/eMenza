"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useStudentSession } from "@/hooks/useStudentSession";
import { adjustStudentCardBalance } from "@/lib/referent-cards-store";
import {
  cancelReservationViaApi,
  fetchMyReservationsFromApi,
  shouldUseReservationsApi,
} from "@/lib/backend/reservations-api";
import { ApiError } from "@/lib/api/client";
import { canCancelMealSlot } from "@/lib/meal-booking-window";
import {
  cancelMealReservation,
  canCancelMealReservation,
  type MealType,
} from "@/lib/dashboard-mock";
import {
  readReservationsCache,
  writeReservationsCache,
} from "@/lib/student-remote-cache";
import { subscribeAppTime } from "@/lib/date-utils";
import type { ReservationRecord } from "@/server/repositories/reservations";

function readCachedReservations(userId: string | undefined) {
  if (!userId) {
    return null;
  }
  return readReservationsCache(userId);
}

type CancelReservationResult = {
  success: boolean;
  refundRsd: number;
};

type MealReservationsContextValue = {
  reservations: ReservationRecord[];
  isLoaded: boolean;
  refresh: () => Promise<void>;
  cancelReservation: (dateKey: string, mealType: MealType) => Promise<CancelReservationResult>;
  usesBackend: boolean;
  isPending: boolean;
};

const MealReservationsContext = createContext<MealReservationsContextValue | null>(null);

export function MealReservationsProvider({ children }: { children: ReactNode }) {
  const backend = shouldUseReservationsApi();
  const { isAuthenticated, isDemo, isReady: sessionReady, session } = useStudentSession();
  const expectsRemote = backend && !isDemo;
  const useRemote = expectsRemote && sessionReady && isAuthenticated;
  const userId = session?.userId;

  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(() => !expectsRemote);
  const hasHydratedCacheRef = useRef(false);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);

  useLayoutEffect(() => {
    if (!expectsRemote || !userId) {
      return;
    }

    const cached = readCachedReservations(userId);
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReservations(cached);
      setIsLoaded(true);
      hasHydratedCacheRef.current = true;
    }
  }, [expectsRemote, userId]);

  const refresh = useCallback(async () => {
    if (!useRemote || !userId) {
      setIsLoaded(true);
      return;
    }

    if (refreshInFlightRef.current) {
      await refreshInFlightRef.current;
      return;
    }

    const task = (async () => {
      try {
        const list = await fetchMyReservationsFromApi();
        setReservations(list);
        writeReservationsCache(userId, list);
      } catch {
        const cached = readCachedReservations(userId);
        if (cached) {
          setReservations(cached);
        }
      } finally {
        setIsLoaded(true);
      }
    })();

    refreshInFlightRef.current = task;

    try {
      await task;
    } finally {
      refreshInFlightRef.current = null;
    }
  }, [useRemote, userId]);

  useEffect(() => {
    if (!backend) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoaded(true);
      return;
    }

    if (!sessionReady) {
      return;
    }

    if (!isAuthenticated || isDemo) {
      setReservations([]);
      setIsLoaded(true);
      return;
    }

    void refresh();
  }, [backend, isAuthenticated, isDemo, refresh, sessionReady]);

  useEffect(() => {
    if (!useRemote || !sessionReady) {
      return;
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }

    function handleWindowFocus() {
      void refresh();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [refresh, sessionReady, useRemote]);

  useEffect(() => {
    if (!useRemote) {
      return;
    }

    const unsubscribe = subscribeAppTime(() => {
      void refresh();
    });

    return () => {
      unsubscribe();
    };
  }, [refresh, useRemote]);

  const cancelReservation = useCallback(
    async (dateKey: string, mealType: MealType): Promise<CancelReservationResult> => {
      if (useRemote) {
        const target = reservations.find(
          (entry) => entry.dateKey === dateKey && entry.mealType === mealType,
        );

        if (!target || !canCancelMealSlot(dateKey, mealType)) {
          return { success: false, refundRsd: 0 };
        }

        if (target.status !== "zakazano") {
          return { success: false, refundRsd: 0 };
        }

        try {
          const response = await cancelReservationViaApi(target.id);
          await refresh();
          return { success: true, refundRsd: response.reservation.totalRsd };
        } catch (error) {
          if (error instanceof ApiError) {
            throw error;
          }
          throw new ApiError("Otkazivanje nije uspelo.", 400);
        }
      }

      if (!canCancelMealReservation(dateKey, mealType)) {
        return { success: false, refundRsd: 0 };
      }

      const result = cancelMealReservation(dateKey, mealType);
      if (!result.success) {
        return { success: false, refundRsd: 0 };
      }

      if (result.cardId && result.refundRsd > 0) {
        adjustStudentCardBalance(
          result.cardId,
          result.refundRsd,
          `Povrat otkazane rezervacije — ${dateKey}`,
        );
      }

      return { success: true, refundRsd: result.refundRsd };
    },
    [useRemote, reservations, refresh],
  );

  const value = useMemo(
    () => ({
      reservations,
      isLoaded,
      refresh,
      cancelReservation,
      usesBackend: expectsRemote,
      isPending:
        expectsRemote &&
        isAuthenticated &&
        !isLoaded &&
        reservations.length === 0,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      cancelReservation,
      expectsRemote,
      isAuthenticated,
      isLoaded,
      refresh,
      reservations,
      sessionReady,
    ],
  );

  return (
    <MealReservationsContext.Provider value={value}>{children}</MealReservationsContext.Provider>
  );
}

export function useMealReservationsContext() {
  const context = useContext(MealReservationsContext);
  if (!context) {
    throw new Error("useMealReservations must be used within MealReservationsProvider");
  }
  return context;
}
