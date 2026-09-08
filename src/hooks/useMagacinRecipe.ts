"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createInitialRecipeState,
  type ConsumptionPlan,
  type DishDemand,
  type RecipeState,
} from "@/lib/magacin-recipe-mock";
import {
  computeConsumptionPlan,
  getDemoDemand,
  hydrateRecipesFromCache,
  loadRecipeState,
  resetRecipeSync,
  subscribeRecipes,
  syncRecipesFromApi,
} from "@/lib/magacin-recipe-store";
import { loadMagacinState } from "@/lib/magacin-store";
import { fetchDemandFromApi, shouldUseRecipeApi } from "@/lib/backend/magacin-recipe-api";
import type { MealType } from "@/lib/meal-types";

const SYNC_TIMEOUT_MS = 8_000;

function useRecipeSync() {
  const [state, setState] = useState<RecipeState>(() => createInitialRecipeState());
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const didSyncOnce = useRef(false);

  useEffect(() => {
    hydrateRecipesFromCache({ notify: true });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(loadRecipeState());
    const unsubscribe = subscribeRecipes(() => {
      setState(loadRecipeState());
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!shouldUseRecipeApi()) return;
    if (didSyncOnce.current) return;
    didSyncOnce.current = true;
    setSyncing(true);

    const syncTimer = setTimeout(() => {
      if (!mountedRef.current) return;
      resetRecipeSync();
      setSyncing(false);
      setSyncError("Server ne odgovara. Prikazani su keširani podaci.");
    }, SYNC_TIMEOUT_MS);

    void syncRecipesFromApi()
      .then((result) => {
        clearTimeout(syncTimer);
        if (!mountedRef.current) return;
        setSyncing(false);
        setSyncError(result.ok ? null : (result.error ?? "Greška pri učitavanju spiskova"));
      })
      .catch(() => {
        clearTimeout(syncTimer);
        if (!mountedRef.current) return;
        setSyncing(false);
        setSyncError("Greška pri učitavanju spiskova");
      });

    return () => {
      clearTimeout(syncTimer);
    };
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const retry = useCallback(() => {
    setSyncError(null);
    if (!shouldUseRecipeApi()) return;
    setSyncing(true);
    const syncTimer = setTimeout(() => {
      if (!mountedRef.current) return;
      resetRecipeSync();
      setSyncing(false);
      setSyncError("Server ne odgovara. Prikazani su keširani podaci.");
    }, SYNC_TIMEOUT_MS);
    void syncRecipesFromApi()
      .then((result) => {
        clearTimeout(syncTimer);
        if (!mountedRef.current) return;
        setSyncing(false);
        setSyncError(result.ok ? null : (result.error ?? "Greška pri učitavanju spiskova"));
      })
      .catch(() => {
        clearTimeout(syncTimer);
        if (!mountedRef.current) return;
        setSyncing(false);
        setSyncError("Greška pri učitavanju spiskova");
      });
  }, []);

  return { state, syncing, syncError, retry };
}

export function useMagacinRecipe() {
  const { state, syncing, syncError, retry } = useRecipeSync();
  const [dateKey, setDateKey] = useState<string>(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  });
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [demand, setDemand] = useState<DishDemand[]>([]);
  const [demandLoading, setDemandLoading] = useState(false);
  const [demandError, setDemandError] = useState<string | null>(null);
  const [demandVersion, setDemandVersion] = useState(0);

  const refreshDemand = useCallback(() => {
    setDemandVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    let active = true;

    if (!shouldUseRecipeApi()) {
      const recipes = loadRecipeState().recipes;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDemand(getDemoDemand(recipes));
      setDemandError(null);
      return;
    }

    setDemandLoading(true);
    setDemandError(null);

    fetchDemandFromApi(dateKey, mealType)
      .then((result) => {
        if (!active) return;
        setDemand(result.demand);
        setDemandLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        setDemand([]);
        setDemandLoading(false);
        setDemandError(error instanceof Error ? error.message : "Greška pri obračunu porudžbina.");
      });

    return () => {
      active = false;
    };
  }, [dateKey, mealType, demandVersion, state.recipes]);

  const plan: ConsumptionPlan | null = computeConsumptionPlan(
    state.recipes,
    loadMagacinState().ingredients,
    demand,
    dateKey,
    mealType,
    state.appliedDates,
  );

  return {
    state,
    syncing,
    syncError,
    retry,
    dateKey,
    setDateKey,
    mealType,
    setMealType,
    demand,
    demandLoading,
    demandError,
    plan,
    refreshDemand,
  };
}
