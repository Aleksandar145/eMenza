import {
  cloneDishCatalogState,
  createInitialDishCatalogState,
  defaultPortionWeightGramsByCategory,
  type Dish,
  type DishBadge,
  type DishCatalogState,
  type DishCategory,
  type DishStatus,
} from "@/lib/dish-catalog-mock";
import { ApiError } from "@/lib/api/client";
import {
  fetchDishesFromApi,
  resetInFlightDishes,
  shouldUseDishesApi,
} from "@/lib/backend/admin-api";
import {
  createDishViaApi,
  deleteDishViaApi,
  shouldUseDishApi,
  updateDishViaApi,
} from "@/lib/backend/dish-api";
import {
  readDishCatalogCache,
  writeDishCatalogCache,
} from "@/lib/student-remote-cache";

export const DISH_CATALOG_STORAGE_KEY = "emenza-dish-catalog";
export const DISH_CATALOG_DEMO_VERSION = 3;

type StoredDishCatalog = DishCatalogState & { demoVersion?: number };

type DishCatalogListener = () => void;

const listeners = new Set<DishCatalogListener>();
let memoryState: DishCatalogState | null = null;
let remoteState: DishCatalogState | null = null;
let _generation = 0;

export function getCatalogGeneration() { return _generation; }

function bumpGeneration() {
  _generation++;
}

const emptyDishCatalogState: DishCatalogState = { dishes: [] };

export function isDishCatalogSynced() {
  return !shouldUseDishesApi() || remoteState !== null;
}

export function isDishCatalogHydratedForKitchenUI() {
  if (!shouldUseDishesApi()) {
    return true;
  }

  return remoteState !== null || memoryState !== null;
}

let catalogSyncPromise: Promise<{ ok: boolean; error?: string }> | null = null;

function hydrateDishCatalogFromSessionCache(options?: { notify?: boolean }) {
  const cached = readDishCatalogCache();
  if (!cached) {
    return false;
  }

  remoteState = cloneDishCatalogState(cached);
  if (options?.notify !== false) {
    notifyListeners();
  }
  return true;
}

export function hydrateDishCatalogFromCache(options?: { notify?: boolean }) {
  return hydrateDishCatalogFromSessionCache(options);
}

export function mergeRemoteDishes(incoming: Dish[]) {
  if (!shouldUseDishesApi()) {
    return;
  }

  const current = remoteState ?? { dishes: [] };
  const dishMap = new Map(current.dishes.map((dish) => [dish.id, dish]));
  for (const dish of incoming) {
    dishMap.set(dish.id, dish);
  }

  remoteState = { dishes: [...dishMap.values()] };
  writeDishCatalogCache(remoteState);
  notifyListeners();
}

export function resetCatalogSync() {
  catalogSyncPromise = null;
  resetInFlightDishes();
}

export async function syncDishCatalogFromApi(): Promise<{ ok: boolean; error?: string }> {
  if (!shouldUseDishesApi()) {
    return { ok: true };
  }

  if (catalogSyncPromise) {
    return catalogSyncPromise;
  }

  if (!remoteState) {
    hydrateDishCatalogFromSessionCache();
  }

  catalogSyncPromise = (async (): Promise<{ ok: boolean; error?: string }> => {
    try {
      remoteState = await fetchDishesFromApi();
      writeDishCatalogCache(remoteState);
      notifyListeners();
      return { ok: true };
    } catch (error) {
      const hadCache = Boolean(remoteState);
      const isTimeout = error instanceof ApiError && error.status === 408;

      if (isTimeout && hadCache) {
        console.warn("[dish-catalog] sync timed out; using cached catalog");
        return { ok: true };
      }

      console.error("[dish-catalog] sync failed", error);
      const message = error instanceof Error ? error.message : "Nepoznata greška";

      if (!remoteState) {
        remoteState = cloneDishCatalogState(emptyDishCatalogState);
        notifyListeners();
      }

      return { ok: false, error: message };
    } finally {
      catalogSyncPromise = null;
    }
  })();

  return catalogSyncPromise;
}

function withDemoVersion(state: DishCatalogState): StoredDishCatalog {
  return { ...state, demoVersion: DISH_CATALOG_DEMO_VERSION };
}

function notifyListeners() {
  bumpGeneration();
  listeners.forEach((listener) => listener());
}

function persistState(state: DishCatalogState) {
  memoryState = cloneDishCatalogState(state);
  if (typeof window !== "undefined" && !shouldUseDishesApi()) {
    localStorage.setItem(DISH_CATALOG_STORAGE_KEY, JSON.stringify(withDemoVersion(state)));
  }
  notifyListeners();
}

export function loadDishCatalogState(): DishCatalogState {
  if (remoteState) {
    return cloneDishCatalogState(remoteState);
  }

  if (shouldUseDishesApi()) {
    return cloneDishCatalogState(emptyDishCatalogState);
  }

  if (memoryState) {
    return cloneDishCatalogState(memoryState);
  }

  if (typeof window === "undefined") {
    return createInitialDishCatalogState();
  }

  try {
    const raw = localStorage.getItem(DISH_CATALOG_STORAGE_KEY);
    if (!raw) {
      const initial = createInitialDishCatalogState();
      memoryState = initial;
      return cloneDishCatalogState(initial);
    }

    const parsed = JSON.parse(raw) as StoredDishCatalog;
    if (parsed.demoVersion !== DISH_CATALOG_DEMO_VERSION) {
      const initial = createInitialDishCatalogState();
      persistState(initial);
      return cloneDishCatalogState(initial);
    }

    memoryState = { dishes: parsed.dishes ?? createInitialDishCatalogState().dishes };
    return cloneDishCatalogState(memoryState);
  } catch {
    const initial = createInitialDishCatalogState();
    memoryState = initial;
    return cloneDishCatalogState(initial);
  }
}

export function subscribeDishCatalog(listener: DishCatalogListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function mutateState(mutator: (state: DishCatalogState) => DishCatalogState) {
  const next = mutator(loadDishCatalogState());
  persistState(next);
}

function slugifyId(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function nextDishId(category: DishCategory, name: string) {
  const base = `dish-${category}-${slugifyId(name)}`;
  const existing = new Set(loadDishCatalogState().dishes.map((dish) => dish.id));
  if (!existing.has(base)) {
    return base;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export function getActiveDishes(): Dish[] {
  return loadDishCatalogState().dishes.filter((dish) => dish.status === "active");
}

export function getDishesByCategory(category: DishCategory, includePendingForKitchen = false): Dish[] {
  return loadDishCatalogState().dishes.filter((dish) => {
    if (dish.category !== category) {
      return false;
    }
    if (dish.status === "active") {
      return true;
    }
    return includePendingForKitchen && dish.status === "pending_approval";
  });
}

export function getDishById(id: string): Dish | null {
  return loadDishCatalogState().dishes.find((dish) => dish.id === id) ?? null;
}

export function getDishesByIds(ids: string[]): Dish[] {
  const map = new Map(loadDishCatalogState().dishes.map((dish) => [dish.id, dish]));
  return ids.map((id) => map.get(id)).filter((dish): dish is Dish => Boolean(dish));
}

export function getActiveDishesByIds(ids: string[]): Dish[] {
  return getDishesByIds(ids).filter((dish) => dish.status === "active");
}

export type CreateDishInput = {
  name: string;
  category: DishCategory;
  priceRsd: number;
  imageUrl: string;
  badges?: DishBadge[];
  proposedBy?: "kitchen" | "admin";
  status?: DishStatus;
};

export function createDish(input: CreateDishInput) {
  const now = new Date().toISOString();
  const dish: Dish = {
    id: nextDishId(input.category, input.name),
    name: input.name.trim(),
    category: input.category,
    priceRsd: Math.max(0, input.priceRsd),
    portionWeightGrams: defaultPortionWeightGramsByCategory[input.category],
    imageUrl: input.imageUrl.trim(),
    badges: input.badges ?? [],
    status: input.status ?? "active",
    proposedBy: input.proposedBy ?? "admin",
    createdAt: now,
    updatedAt: now,
  };

  mutateState((state) => ({ dishes: [...state.dishes, dish] }));

  if (remoteState) {
    remoteState = { dishes: [...remoteState.dishes, dish] };
    notifyListeners();
  }

  if (shouldUseDishApi()) {
    void createDishViaApi(dish)
      .then((state) => {
        remoteState = cloneDishCatalogState(state);
        writeDishCatalogCache(remoteState);
        notifyListeners();
      })
      .catch(() => {});
  }

  return dish;
}

export function proposeDish(input: Omit<CreateDishInput, "status" | "proposedBy">) {
  return createDish({
    ...input,
    status: "pending_approval",
    proposedBy: "kitchen",
  });
}

export function updateDish(id: string, patch: Partial<Omit<Dish, "id" | "createdAt">>) {
  const state = loadDishCatalogState();
  const existing = state.dishes.find((d) => d.id === id);
  if (!existing) return;

  const updated: Dish = {
    ...existing,
    ...patch,
    name: patch.name?.trim() ?? existing.name,
    imageUrl: patch.imageUrl?.trim() ?? existing.imageUrl,
    updatedAt: new Date().toISOString(),
  };

  mutateState((s) => ({
    dishes: s.dishes.map((d) => (d.id === id ? updated : d)),
  }));

  if (remoteState) {
    remoteState = {
      dishes: remoteState.dishes.map((d) => (d.id === id ? updated : d)),
    };
    notifyListeners();
  }

  if (shouldUseDishApi()) {
    void updateDishViaApi(updated).then((apiState) => {
      remoteState = cloneDishCatalogState(apiState);
      writeDishCatalogCache(remoteState);
      notifyListeners();
    }).catch(() => {});
  }
}

export function approveDish(id: string) {
  updateDish(id, { status: "active", proposedBy: "admin" });
}

export function archiveDish(id: string) {
  const state = loadDishCatalogState();
  const existing = state.dishes.find((d) => d.id === id);
  if (!existing) return;

  const updated: Dish = { ...existing, status: "archived", updatedAt: new Date().toISOString() };

  mutateState((s) => ({
    dishes: s.dishes.map((d) => (d.id === id ? updated : d)),
  }));

  if (remoteState) {
    remoteState = {
      dishes: remoteState.dishes.map((d) => (d.id === id ? updated : d)),
    };
    notifyListeners();
  }

  if (shouldUseDishApi()) {
    void updateDishViaApi(updated).then((apiState) => {
      remoteState = cloneDishCatalogState(apiState);
      writeDishCatalogCache(remoteState);
      notifyListeners();
    }).catch(() => {});
  }
}

export function unarchiveDish(id: string) {
  const state = loadDishCatalogState();
  const existing = state.dishes.find((d) => d.id === id);
  if (!existing) return;

  const updated: Dish = { ...existing, status: "active", updatedAt: new Date().toISOString() };

  mutateState((s) => ({
    dishes: s.dishes.map((d) => (d.id === id ? updated : d)),
  }));

  if (remoteState) {
    remoteState = {
      dishes: remoteState.dishes.map((d) => (d.id === id ? updated : d)),
    };
    notifyListeners();
  }

  if (shouldUseDishApi()) {
    void updateDishViaApi(updated).then((apiState) => {
      remoteState = cloneDishCatalogState(apiState);
      writeDishCatalogCache(remoteState);
      notifyListeners();
    }).catch(() => {});
  }
}

export function deleteDish(id: string) {
  mutateState((state) => ({
    dishes: state.dishes.filter((dish) => dish.id !== id),
  }));

  if (remoteState) {
    remoteState = { dishes: remoteState.dishes.filter((dish) => dish.id !== id) };
    notifyListeners();
  }

  if (shouldUseDishApi()) {
    void deleteDishViaApi(id).then((apiState) => {
      remoteState = cloneDishCatalogState(apiState);
      writeDishCatalogCache(remoteState);
      notifyListeners();
    }).catch(() => {});
  }
}

export function getPendingDishes(): Dish[] {
  return loadDishCatalogState().dishes.filter((dish) => dish.status === "pending_approval");
}
