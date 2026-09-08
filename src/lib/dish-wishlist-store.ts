import type { CreatorSlotId } from "@/lib/kreator-obroka-mock";
import { readCachedStudentSessionUserId } from "@/contexts/StudentSessionProvider";

export type DishRanking = {
  dishId: string;
  rank: number;
};

export type DishWishlist = Record<CreatorSlotId, DishRanking[]>;

const STORAGE_KEY_PREFIX = "emza-dish-wishlist";

function storageKey(): string {
  const userId = readCachedStudentSessionUserId();
  return userId ? `${STORAGE_KEY_PREFIX}:${userId}` : STORAGE_KEY_PREFIX;
}

function loadRaw(): DishWishlist {
  if (typeof window === "undefined") {
    return { main: [], side: [], salad: [], dessert: [] };
  }
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return { main: [], side: [], salad: [], dessert: [] };
    return JSON.parse(raw) as DishWishlist;
  } catch {
    return { main: [], side: [], salad: [], dessert: [] };
  }
}

function persist(wishlist: DishWishlist) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(), JSON.stringify(wishlist));
}

export function loadDishWishlist(): DishWishlist {
  return loadRaw();
}

export function saveDishWishlist(wishlist: DishWishlist) {
  persist(wishlist);
}

export function addDishRanking(wishlist: DishWishlist, slotId: CreatorSlotId, dishId: string): DishWishlist {
  const slot = wishlist[slotId] ?? [];
  if (slot.some((r) => r.dishId === dishId)) return wishlist;
  const next = { ...wishlist, [slotId]: [...slot, { dishId, rank: slot.length + 1 }] };
  persist(next);
  return next;
}

export function removeDishRanking(wishlist: DishWishlist, slotId: CreatorSlotId, dishId: string): DishWishlist {
  const slot = (wishlist[slotId] ?? []).filter((r) => r.dishId !== dishId);
  const reindexed = slot.map((r, i) => ({ ...r, rank: i + 1 }));
  const next = { ...wishlist, [slotId]: reindexed };
  persist(next);
  return next;
}

export function moveDishRanking(wishlist: DishWishlist, slotId: CreatorSlotId, dishId: string, direction: "up" | "down"): DishWishlist {
  const slot = [...(wishlist[slotId] ?? [])];
  const idx = slot.findIndex((r) => r.dishId === dishId);
  if (idx < 0) return wishlist;
  const target = direction === "up" ? idx - 1 : idx + 1;
  if (target < 0 || target >= slot.length) return wishlist;
  [slot[idx], slot[target]] = [slot[target], slot[idx]];
  const reindexed = slot.map((r, i) => ({ ...r, rank: i + 1 }));
  const next = { ...wishlist, [slotId]: reindexed };
  persist(next);
  return next;
}

export function setDishRankings(wishlist: DishWishlist, slotId: CreatorSlotId, dishIds: string[]): DishWishlist {
  const ranked = dishIds.map((dishId, i) => ({ dishId, rank: i + 1 }));
  const next = { ...wishlist, [slotId]: ranked };
  persist(next);
  return next;
}
