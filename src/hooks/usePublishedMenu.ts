"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { subscribeDishCatalog } from "@/lib/dish-catalog-store";
import { useStudentSession } from "@/hooks/useStudentSession";
import { isClientBackendEnabled } from "@/lib/backend-config";
import {
  canRenderPublishedMenuFromCache,
  getPublishedMenuOptions,
  hydrateStudentMenuCaches,
  isDailyMenuPublished,
  isPublishedMenuFetched,
  subscribeKuhinjaJelovnik,
  syncPublishedMenuFromApi,
} from "@/lib/kuhinja-jelovnik-store";
import {
  creatorSlotOrder,
  hasSelectableMealOptions,
  type CreatorSlotId,
  type KreatorMenuContext,
  type MealOption,
} from "@/lib/kreator-obroka-mock";
import type { MealType } from "@/lib/meal-types";

const emptyOptions = creatorSlotOrder.reduce(
  (acc, slotId) => {
    acc[slotId] = [];
    return acc;
  },
  {} as Record<CreatorSlotId, MealOption[]>,
);

export function usePublishedMenu(dateKey: string, mealType: MealType) {
  const backend = isClientBackendEnabled();
  const { isAuthenticated, isDemo, isSessionValidated } = useStudentSession();
  const canSyncRemote = backend && isAuthenticated && !isDemo && isSessionValidated;
  const [syncVersion, setSyncVersion] = useState(0);

  useLayoutEffect(() => {
    if (!backend) {
      return;
    }

    if (hydrateStudentMenuCaches()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSyncVersion((current) => current + 1);
    }
  }, [backend]);

  useEffect(() => {
    if (!canSyncRemote) {
      return;
    }

    let cancelled = false;

    void syncPublishedMenuFromApi(dateKey, mealType).then(() => {
      if (!cancelled) {
        setSyncVersion((current) => current + 1);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [canSyncRemote, dateKey, mealType]);

  useEffect(() => {
    if (!backend) {
      return;
    }

    const unsubCatalog = subscribeDishCatalog(() => {
      setSyncVersion((current) => current + 1);
    });
    const unsubJelovnik = subscribeKuhinjaJelovnik(() => {
      setSyncVersion((current) => current + 1);
    });

    return () => {
      unsubCatalog();
      unsubJelovnik();
    };
  }, [backend]);

  const refresh = useCallback(async () => {
    if (!canSyncRemote) {
      return;
    }
    await syncPublishedMenuFromApi(dateKey, mealType, { force: true });
    setSyncVersion((current) => current + 1);
  }, [canSyncRemote, dateKey, mealType]);

  const context = useMemo<KreatorMenuContext>(
    () => ({ dateKey, mealType }),
    [dateKey, mealType],
  );

  const isReady = useMemo(() => {
    if (!backend) {
      return true;
    }

    if (isPublishedMenuFetched(dateKey, mealType)) {
      return true;
    }

    return canRenderPublishedMenuFromCache(dateKey, mealType);
  }, [backend, dateKey, mealType]);
  const menuAvailable = isDailyMenuPublished(dateKey, mealType);

  const optionsBySlot = useMemo(() => {
    void syncVersion;
    const published = getPublishedMenuOptions(dateKey, mealType);
    if (!published) {
      return emptyOptions;
    }
    return published;
  }, [dateKey, mealType, syncVersion]);

  const hasAvailableDishes = useMemo(
    () => creatorSlotOrder.some((slotId) => hasSelectableMealOptions(optionsBySlot[slotId])),
    [optionsBySlot],
  );

  const isEmpty = menuAvailable && !hasAvailableDishes;

  return {
    isReady,
    menuAvailable,
    hasAvailableDishes,
    isEmpty,
    optionsBySlot,
    context,
    refresh,
  };
}
