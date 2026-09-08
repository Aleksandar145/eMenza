import {
  cloneRecipeState,
  createInitialRecipeState,
  getRecipeForDish,
  idForEntry,
  magacinRecipeDemoVersion,
  magacinRecipeStorageKey,
  type ConsumptionPlan,
  type DishDemand,
  type DishRecipe,
  type DishRecipeEntry,
  type IngredientConsumption,
  type RecipeState,
} from "@/lib/magacin-recipe-mock";
import { ApiError } from "@/lib/api/client";
import {
  deleteRecipeViaApi,
  fetchRecipesFromApi,
  markDateAppliedViaApi,
  shouldUseRecipeApi,
  upsertRecipeViaApi,
} from "@/lib/backend/magacin-recipe-api";
import { loadMagacinState, adjustStock } from "@/lib/magacin-store";
import type { Ingredient } from "@/lib/magacin-mock";
import type { MealType } from "@/lib/meal-types";

type StoredRecipe = RecipeState & { demoVersion?: number };

type RecipeListener = () => void;

const listeners = new Set<RecipeListener>();
let memoryState: RecipeState | null = null;
let remoteState: RecipeState | null = null;
let _generation = 0;

export function getRecipeGeneration() {
  return _generation;
}

function bumpGeneration() {
  _generation++;
}

const emptyRecipeState: RecipeState = { recipes: [], appliedDates: [] };

export function isRecipeSynced() {
  return !shouldUseRecipeApi() || remoteState !== null;
}

let recipeSyncPromise: Promise<{ ok: boolean; error?: string }> | null = null;

function notifyListeners() {
  bumpGeneration();
  listeners.forEach((l) => l());
}

function setRemoteData(state: RecipeState) {
  if (!state) return;
  memoryState = cloneRecipeState(state);
  remoteState = cloneRecipeState(state);
}

function persistLocalState(state: RecipeState) {
  memoryState = cloneRecipeState(state);
  if (typeof window !== "undefined" && !shouldUseRecipeApi()) {
    try {
      localStorage.setItem(
        magacinRecipeStorageKey,
        JSON.stringify({ ...state, demoVersion: magacinRecipeDemoVersion } as StoredRecipe),
      );
    } catch {
      // noop
    }
  }
  notifyListeners();
}

function readCache(): RecipeState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("emenza-magacin-recipe-cache");
    return raw ? ((JSON.parse(raw) as StoredRecipe) as RecipeState) : null;
  } catch {
    return null;
  }
}

function writeCache(state: RecipeState) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem("emenza-magacin-recipe-cache", JSON.stringify(state));
  } catch {
    // noop
  }
}

function hydrateFromCache(options?: { notify?: boolean }) {
  const cached = readCache();
  if (!cached) return false;
  remoteState = cloneRecipeState(cached);
  memoryState = cloneRecipeState(cached);
  if (options?.notify !== false) notifyListeners();
  return true;
}

export function hydrateRecipesFromCache(options?: { notify?: boolean }) {
  return hydrateFromCache(options);
}

export function mergeRemoteRecipes(incoming: RecipeState) {
  if (!shouldUseRecipeApi()) return;
  setRemoteData(incoming);
  if (remoteState) writeCache(remoteState);
  notifyListeners();
}

export function resetRecipeSync() {
  recipeSyncPromise = null;
}

export async function syncRecipesFromApi(): Promise<{ ok: boolean; error?: string }> {
  if (!shouldUseRecipeApi()) return { ok: true };
  if (recipeSyncPromise) return recipeSyncPromise;
  if (!remoteState) hydrateFromCache();

  recipeSyncPromise = (async () => {
    const generationAtStart = getRecipeGeneration();
    try {
      const fetched = await fetchRecipesFromApi();
      // Ne pregaži lokalno izmene ako su nastale dok je fetch trajao.
      if (getRecipeGeneration() === generationAtStart) {
        setRemoteData(fetched);
        if (remoteState) writeCache(remoteState);
        notifyListeners();
      }
      return { ok: true };
    } catch (error) {
      const hadCache = Boolean(remoteState);
      const isTimeout = error instanceof ApiError && error.status === 408;
      if (isTimeout && hadCache) {
        return { ok: true };
      }
      console.error("[magacin-recipe] sync failed", error);
      if (!remoteState) {
        remoteState = cloneRecipeState(emptyRecipeState);
        notifyListeners();
      }
      const message = error instanceof Error ? error.message : "Nepoznata greška";
      return { ok: false, error: message };
    } finally {
      recipeSyncPromise = null;
    }
  })();

  return recipeSyncPromise;
}

export function loadRecipeState(): RecipeState {
  if (memoryState) return cloneRecipeState(memoryState);
  if (remoteState) return cloneRecipeState(remoteState);
  if (shouldUseRecipeApi()) return cloneRecipeState(emptyRecipeState);

  if (typeof window === "undefined") return createInitialRecipeState();

  try {
    const raw = localStorage.getItem(magacinRecipeStorageKey);
    if (!raw) {
      const initial = createInitialRecipeState();
      memoryState = initial;
      return cloneRecipeState(initial);
    }
    const parsed = JSON.parse(raw) as StoredRecipe;
    if (parsed.demoVersion !== magacinRecipeDemoVersion) {
      const initial = createInitialRecipeState();
      persistLocalState(initial);
      return cloneRecipeState(initial);
    }
    memoryState = {
      recipes: parsed.recipes ?? createInitialRecipeState().recipes,
      appliedDates: parsed.appliedDates ?? [],
    };
    return cloneRecipeState(memoryState);
  } catch {
    const initial = createInitialRecipeState();
    memoryState = initial;
    return cloneRecipeState(initial);
  }
}

export function subscribeRecipes(listener: RecipeListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function mutateState(mutator: (state: RecipeState) => RecipeState) {
  const next = mutator(loadRecipeState());
  persistLocalState(next);
}

export type RecipeEntryInput = {
  ingredientId?: string;
  ingredientName: string;
  unit: DishRecipeEntry["unit"];
  perServing: number;
  used: boolean;
};

export function upsertRecipe(
  dishName: string,
  entries: RecipeEntryInput[],
  totalGramsPerPortion?: number,
) {
  const name = dishName.trim();
  if (!name) return;
  const now = new Date().toISOString();
  const typedEntries: DishRecipeEntry[] = entries.map((e) => ({
    id: idForEntry(name, e.ingredientName),
    ingredientId: e.ingredientId,
    ingredientName: e.ingredientName,
    unit: e.unit,
    perServing: Math.max(0, e.perServing),
    used: e.used,
  }));

  const existing = getRecipeForDish(loadRecipeState(), name);
  const nextRecipe: DishRecipe = {
    dishName: name,
    entries: typedEntries,
    updatedAt: now,
    totalGramsPerPortion: totalGramsPerPortion
      ? Math.max(0, totalGramsPerPortion)
      : undefined,
  };

  mutateState((s) => ({
    ...s,
    recipes: existing
      ? s.recipes.map((r) =>
          r.dishName.toLowerCase() === name.toLowerCase() ? nextRecipe : r,
        )
      : [...s.recipes, nextRecipe],
  }));

  if (remoteState) {
    remoteState = {
      ...remoteState,
      recipes: existing
        ? remoteState.recipes.map((r) =>
            r.dishName.toLowerCase() === name.toLowerCase() ? nextRecipe : r,
          )
        : [...remoteState.recipes, nextRecipe],
    };
    notifyListeners();
  }

  if (shouldUseRecipeApi()) {
    void upsertRecipeViaApi({
      dishName: name,
      entries: typedEntries,
      totalGramsPerPortion: nextRecipe.totalGramsPerPortion,
    })
      .then((apiState) => {
        setRemoteData(apiState);
        if (remoteState) writeCache(remoteState);
        notifyListeners();
      })
      .catch(() => {});
  }
}

export function deleteRecipe(dishName: string) {
  mutateState((s) => ({
    ...s,
    recipes: s.recipes.filter((r) => r.dishName.toLowerCase() !== dishName.toLowerCase()),
  }));

  if (remoteState) {
    remoteState = {
      ...remoteState,
      recipes: remoteState.recipes.filter(
        (r) => r.dishName.toLowerCase() !== dishName.toLowerCase(),
      ),
    };
    notifyListeners();
  }

  if (shouldUseRecipeApi()) {
    void deleteRecipeViaApi(dishName)
      .then((apiState) => {
        setRemoteData(apiState);
        if (remoteState) writeCache(remoteState);
        notifyListeners();
      })
      .catch(() => {});
  }
}

/** Korekcija zalihe zbog greške – delta se dodaje/oduzima od currentStock. */
export function correctIngredientStock(ingredientId: string, delta: number) {
  adjustStock(ingredientId, delta);
}

export function getDemoDemand(recipes: DishRecipe[]): DishDemand[] {
  const names = recipes.map((r) => r.dishName);
  return names.slice(0, 6).map((name, i) => ({
    dishName: name,
    servings: [48, 32, 26, 21, 18, 15][i] ?? 10,
  }));
}

export function computeConsumptionPlan(
  recipes: DishRecipe[],
  ingredients: Ingredient[],
  demand: DishDemand[],
  dateKey: string,
  mealType: MealType,
  appliedDates: string[],
): ConsumptionPlan {
  const demandMap = new Map<string, number>();
  for (const d of demand) {
    demandMap.set(d.dishName.toLowerCase(), d.servings);
  }

  const orderedRecipes = recipes.filter((r) =>
    demandMap.has(r.dishName.toLowerCase()),
  );

  const totalServings = orderedRecipes.reduce(
    (sum, r) => sum + (demandMap.get(r.dishName.toLowerCase()) ?? 0),
    0,
  );

  const ingredientMap = new Map<string, Ingredient>();
  for (const ing of ingredients) ingredientMap.set(ing.name.toLowerCase(), ing);

  const acc = new Map<string, IngredientConsumption>();

  function ensure(ingredientName: string): IngredientConsumption {
    const key = ingredientName.toLowerCase();
    const found = ingredientMap.get(key);
    const type = (found?.ingredientType ?? "main") as IngredientConsumption["ingredientType"];
    const unit = found?.unit ?? "kg";
    const exists = acc.get(key);
    if (exists) return exists;
    const row: IngredientConsumption = {
      ingredientId: found?.id,
      ingredientName: found ? found.name : ingredientName,
      unit,
      ingredientType: type,
      currentStock: found?.currentStock ?? 0,
      minStock: found?.minStock ?? 0,
      perServingTotal: 0,
      servingsOrdered: 0,
      neededThisMenu: 0,
      usedInOrderedMenu: false,
      remainingAfterMenu: 0,
      servingsPossible: 0,
      applied: false,
      correction: 0,
      usedInAnyRecipe: false,
    };
    acc.set(key, row);
    return row;
  }

  for (const recipe of recipes) {
    for (const entry of recipe.entries) {
      const row = ensure(entry.ingredientName);
      row.usedInAnyRecipe = true;
    }
  }

  for (const recipe of orderedRecipes) {
    const servings = demandMap.get(recipe.dishName.toLowerCase()) ?? 0;
    for (const entry of recipe.entries) {
      const row = ensure(entry.ingredientName);
      if (entry.used || entry.perServing > 0) {
        row.usedInOrderedMenu = true;
        row.servingsOrdered += servings;
      }
      if (entry.perServing > 0) {
        row.perServingTotal += entry.perServing;
        row.neededThisMenu += entry.perServing * servings;
      }
    }
  }

  const applied = appliedDates.includes(dateKey);

  for (const row of acc.values()) {
    if (row.ingredientType === "main" && row.perServingTotal > 0) {
      // Ako je potrošnja već primenjena, currentStock je već umanjen za neededThisMenu.
      row.remainingAfterMenu = applied
        ? row.currentStock
        : row.currentStock - row.neededThisMenu;
      row.servingsPossible =
        row.perServingTotal > 0
          ? Math.floor(row.currentStock / row.perServingTotal)
          : row.currentStock;
      row.applied = applied;
    } else {
      row.servingsPossible = row.currentStock > 0 ? Infinity : 0;
      row.remainingAfterMenu = row.currentStock;
      row.applied = applied && row.usedInOrderedMenu;
    }
  }

  return {
    dateKey,
    mealType,
    demand,
    ingredients: Array.from(acc.values()),
    appliedAt: applied ? dateKey : undefined,
    totalServings,
  };
}

/** Ručno uneta potrošnja za rezijsku namirnicu, prema nazivu namirnice. */
export type OverheadConsumptionInput = {
  ingredientName: string;
  quantity: number;
};

/**
 * Primena potrošnje: oduzima potrebne glavne sirovine sa zalihe i označava
 * dan kao obrađen. Rezijske namirnice se oduzimaju samo prema ručno unetoj
 * količini (overheadConsumption), jer spisak za njih ne nosi količinu.
 */
export function applyConsumption(
  plan: ConsumptionPlan,
  overheadConsumption: OverheadConsumptionInput[] = [],
) {
  const ingredients = loadMagacinState().ingredients;
  const ingredientMap = new Map<string, Ingredient>();
  for (const ing of ingredients) ingredientMap.set(ing.name.toLowerCase(), ing);

  for (const row of plan.ingredients) {
    if (row.ingredientType !== "main") continue;
    if (row.neededThisMenu <= 0) continue;
    const ing = row.ingredientId
      ? ingredients.find((i) => i.id === row.ingredientId)
      : ingredientMap.get(row.ingredientName.toLowerCase());
    if (!ing) continue;
    const remaining = Math.max(0, ing.currentStock - row.neededThisMenu);
    adjustStock(ing.id, remaining - ing.currentStock);
  }

  for (const input of overheadConsumption) {
    if (!input.quantity || input.quantity <= 0) continue;
    const ing = ingredientMap.get(input.ingredientName.toLowerCase());
    if (!ing) continue;
    const remaining = Math.max(0, ing.currentStock - input.quantity);
    adjustStock(ing.id, remaining - ing.currentStock);
  }

  mutateState((s) => {
    const appliedDates = s.appliedDates ?? [];
    const next = appliedDates.includes(plan.dateKey)
      ? appliedDates
      : [...appliedDates, plan.dateKey];
    return { ...s, recipes: s.recipes, appliedDates: next };
  });

  if (shouldUseRecipeApi()) {
    void markDateAppliedViaApi(plan.dateKey)
      .then((apiState) => {
        setRemoteData(apiState);
        if (remoteState) writeCache(remoteState);
        notifyListeners();
      })
      .catch(() => {});
  }
}
