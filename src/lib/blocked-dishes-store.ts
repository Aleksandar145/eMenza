import type { MealType } from "@/lib/meal-types";

const STORAGE_KEY = "emenza-blocked-dishes";

export type BlockedDish = {
  id: string;
  dishId: string;
  dishName: string;
  dateKey: string;
  mealType: MealType;
  reason: string;
  blockedAt: string;
  blockedBy: string;
};

type BlockedDishesState = {
  blocked: BlockedDish[];
};

const listeners = new Set<() => void>();

function read(): BlockedDishesState {
  if (typeof window === "undefined") return { blocked: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { blocked: [] };
    return JSON.parse(raw) as BlockedDishesState;
  } catch {
    return { blocked: [] };
  }
}

function write(state: BlockedDishesState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  notify();
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeBlockedDishes(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getBlockedDishes(): BlockedDish[] {
  return read().blocked;
}

export function getBlockedDishesForDate(dateKey: string): BlockedDish[] {
  return read().blocked.filter((entry) => entry.dateKey === dateKey);
}

export function getBlockedDishForMeal(
  dateKey: string,
  mealType: MealType,
  dishId: string,
): BlockedDish | undefined {
  return read().blocked.find(
    (entry) => entry.dateKey === dateKey && entry.mealType === mealType && entry.dishId === dishId,
  );
}

export function getBlockedDishesForMeal(dateKey: string, mealType: MealType): BlockedDish[] {
  return read().blocked.filter(
    (entry) => entry.dateKey === dateKey && entry.mealType === mealType,
  );
}

export function blockDish(input: {
  dishId: string;
  dishName: string;
  dateKey: string;
  mealType: MealType;
  reason: string;
  blockedBy: string;
}): BlockedDish {
  const entry: BlockedDish = {
    id: `blocked-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    dishId: input.dishId,
    dishName: input.dishName,
    dateKey: input.dateKey,
    mealType: input.mealType,
    reason: input.reason,
    blockedAt: new Date().toISOString(),
    blockedBy: input.blockedBy,
  };

  const state = read();
  write({ blocked: [entry, ...state.blocked] });
  return entry;
}

export function unblockDish(blockedId: string) {
  const state = read();
  write({ blocked: state.blocked.filter((entry) => entry.id !== blockedId) });
}
