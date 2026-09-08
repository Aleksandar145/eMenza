"use client";

import { useEffect, useLayoutEffect, type ReactNode } from "react";
import { useTodayDateKey } from "@/contexts/AppTimeProvider";
import { useStudentSession } from "@/hooks/useStudentSession";
import { hydrateDishCatalogFromCache, syncDishCatalogFromApi } from "@/lib/dish-catalog-store";
import { shouldUseDishesApi } from "@/lib/backend/admin-api";
import { shouldUseMenusApi } from "@/lib/backend/menus-api";
import { getSuggestedObrokForDay } from "@/lib/dashboard-mock";
import {
  hydrateStudentMenuCaches,
  syncPublishedMenuFromApi,
} from "@/lib/kuhinja-jelovnik-store";

export function MenuDataPrefetchProvider({ children }: { children: ReactNode }) {
  const todayDateKey = useTodayDateKey();
  const { isAuthenticated, isDemo, isReady: sessionReady, isSessionValidated } = useStudentSession();

  useLayoutEffect(() => {
    hydrateStudentMenuCaches();
    hydrateDishCatalogFromCache();
  }, []);

  useEffect(() => {
    if (!shouldUseDishesApi() || !sessionReady || !isAuthenticated || isDemo || !isSessionValidated) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void syncDishCatalogFromApi();
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [sessionReady, isAuthenticated, isDemo, isSessionValidated]);

  useEffect(() => {
    if (!shouldUseMenusApi() || !sessionReady || !isAuthenticated || isDemo || !isSessionValidated) {
      return;
    }

    void syncPublishedMenuFromApi(todayDateKey, getSuggestedObrokForDay(todayDateKey));
  }, [todayDateKey, sessionReady, isAuthenticated, isDemo, isSessionValidated]);

  return children;
}
