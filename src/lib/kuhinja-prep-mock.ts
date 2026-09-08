import {
  getAllMealReservationsForKitchen,
  type KitchenReservationExport,
} from "@/lib/dashboard-mock";
import {
  getSeedKitchenReservations,
  kitchenSlotLabels,
  kitchenSlotOrder,
  kitchenSlotToMealField,
  type KitchenMenuSlotId,
  type KitchenReservationRecord,
} from "@/lib/kuhinja-mock";
import { parseCardQrPayload } from "@/lib/card-qr";
import { parseSlotDishes } from "@/lib/kuhinja-order-display";
import { loadDishCatalogState } from "@/lib/dish-catalog-store";
import { createInitialDishCatalogState, defaultPortionWeightGramsByCategory } from "@/lib/dish-catalog-mock";
import { getRecipeForDish } from "@/lib/magacin-recipe-mock";
import { loadRecipeState } from "@/lib/magacin-recipe-store";
import { getMenuDishNames } from "@/lib/kuhinja-jelovnik-store";
import type { MealType } from "@/lib/meal-types";

const POSNO_BADGES = new Set(["posno", "voce", "povrce"]);

export type KitchenCounterStats = {
  ordered: number;
  pickedUp: number;
  remaining: number;
};

const excludedCounterStatuses = new Set<KitchenReservationRecord["status"]>([
  "propusteno",
  "nerezervisano",
]);

export type PrepCountRow = {
  dishName: string;
  slot: KitchenMenuSlotId;
  slotLabel: string;
  count: number;
  ordererCount: number;
};

export type PrepSummary = {
  orderCount: number;
  totalPortions: number;
  rows: PrepCountRow[];
  menuDishes: string[];
  slotOrdererCounts: Record<KitchenMenuSlotId, number>;
};

export type PrepDetailRow = PrepCountRow & {
  portionWeightGrams: number;
  totalGrams: number;
  orderSharePercent: number;
  badges?: string[];
};

export type PrepDetailSlotGroup = {
  slotId: KitchenMenuSlotId;
  label: string;
  rows: PrepDetailRow[];
  totalPortions: number;
  totalGrams: number;
  ordererCount: number;
};

export type ReservationDishFields = {
  glavnoJelo: string;
  dodatak: string;
  salata: string;
  obrok: string;
};

export type PrepDetailSummary = PrepSummary & {
  detailRows: PrepDetailRow[];
  totalGrams: number;
  rowsBySlot: PrepDetailSlotGroup[];
  fastingCount: number;
  reservations: ReservationDishFields[];
};

const defaultPortionWeightGramsBySlot: Record<KitchenMenuSlotId, number> = {
  main: defaultPortionWeightGramsByCategory.main,
  side: defaultPortionWeightGramsByCategory.side,
  salad: defaultPortionWeightGramsByCategory.salad,
  dessert: defaultPortionWeightGramsByCategory.dessert,
};

export function resolvePortionWeightGrams(dishName: string, slotId: KitchenMenuSlotId) {
  const normalized = dishName.trim().toLowerCase();

  const recipe = getRecipeForDish(loadRecipeState(), dishName);
  if (recipe?.totalGramsPerPortion && recipe.totalGramsPerPortion > 0) {
    return recipe.totalGramsPerPortion;
  }

  const catalog = loadDishCatalogState();
  const match = catalog.dishes.find((dish) => dish.name.trim().toLowerCase() === normalized);

  if (match) {
    return match.portionWeightGrams ?? defaultPortionWeightGramsByCategory[match.category];
  }

  return defaultPortionWeightGramsBySlot[slotId];
}

function resolveDishBadges(dishName: string): string[] {
  const normalized = dishName.trim().toLowerCase();
  const catalog = loadDishCatalogState();
  const match = catalog.dishes.find((dish) => dish.name.trim().toLowerCase() === normalized);
  return match?.badges ?? [];
}

function mergeRecords(
  live: KitchenReservationExport[],
  seed: KitchenReservationRecord[],
): KitchenReservationRecord[] {
  const seedAsRecords: KitchenReservationRecord[] = seed.map((entry) => ({
    ...entry,
    items: { ...entry.items },
  }));

  const liveAsRecords: KitchenReservationRecord[] = live.map((entry) => ({
    id: entry.id,
    dateKey: entry.dateKey,
    mealType: entry.mealType,
    studentName: entry.studentName,
    status: entry.status,
    items: { ...entry.items },
    pickupMode: entry.pickupMode,
  }));

  const byKey = new Map<string, KitchenReservationRecord>();

  for (const record of seedAsRecords) {
    byKey.set(`${record.dateKey}:${record.mealType}:${record.studentName}`, record);
  }

  for (const record of liveAsRecords) {
    byKey.set(`${record.dateKey}:${record.mealType}:${record.studentName}`, record);
  }

  return Array.from(byKey.values());
}

function getMergedKitchenReservations(
  dateKey: string,
  mealType: MealType,
): KitchenReservationRecord[] {
  const live = getAllMealReservationsForKitchen();
  const seed = getSeedKitchenReservations();

  return mergeRecords(live, seed).filter(
    (entry) => entry.dateKey === dateKey && entry.mealType === mealType,
  );
}

export function getFastingReservationCount(dateKey: string, mealType: MealType): number {
  const catalog = loadDishCatalogState();
  const dishes = catalog.dishes.length > 0 ? catalog.dishes : createInitialDishCatalogState().dishes;

  function isPosnoDish(name: string): boolean {
    const normalized = name.trim().toLowerCase();
    const match = dishes.find((dish) => dish.name.trim().toLowerCase() === normalized);
    if (!match) return false;
    return match.badges.some((badge) => POSNO_BADGES.has(badge));
  }

  return getKitchenReservationsForMeal(dateKey, mealType).filter((entry) => {
    const allDishNames: string[] = [];

    for (const slotId of kitchenSlotOrder) {
      const field = kitchenSlotToMealField[slotId];
      const slotValue = entry.items[field];
      const parsed = parseSlotDishes(slotValue).filter((dish) => dish.name.length > 0);
      for (const dish of parsed) {
        allDishNames.push(dish.name);
      }
    }

    if (allDishNames.length === 0) return false;
    return allDishNames.every((name) => isPosnoDish(name));
  }).length;
}

export function getKitchenReservationsForMeal(
  dateKey: string,
  mealType: MealType,
): KitchenReservationRecord[] {
  return getMergedKitchenReservations(dateKey, mealType).filter(
    (entry) => entry.status === "zakazano" || entry.status === "aktivno",
  );
}

export function getAllKitchenReservationsForMeal(
  dateKey: string,
  mealType: MealType,
): KitchenReservationRecord[] {
  return getMergedKitchenReservations(dateKey, mealType);
}

function getCounterEligibleReservations(
  dateKey: string,
  mealType: MealType,
): KitchenReservationRecord[] {
  return getAllKitchenReservationsForMeal(dateKey, mealType).filter(
    (entry) => !excludedCounterStatuses.has(entry.status),
  );
}

export function getKitchenCounterStats(
  dateKey: string,
  mealType: MealType,
): KitchenCounterStats {
  const reservations = getCounterEligibleReservations(dateKey, mealType);
  const pickedUp = reservations.filter((entry) => entry.status === "iskorisceno").length;

  return {
    ordered: reservations.length,
    pickedUp,
    remaining: reservations.length - pickedUp,
  };
}

const todayMealTypes: MealType[] = ["breakfast", "lunch", "dinner"];

export function getTodaySignedUpStudentCount(dateKey: string): number {
  const students = new Set<string>();

  for (const mealType of todayMealTypes) {
    for (const entry of getCounterEligibleReservations(dateKey, mealType)) {
      students.add(entry.studentName);
    }
  }

  return students.size;
}

function normalizeLookupInput(raw: string): {
  pickupCode: string | null;
  cardId: string | null;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { pickupCode: null, cardId: null };
  }

  const cardFromQr = parseCardQrPayload(trimmed);
  if (cardFromQr) {
    return { pickupCode: null, cardId: cardFromQr.toUpperCase() };
  }

  const upper = trimmed.toUpperCase();
  if (upper.startsWith("EMZ-CARD-")) {
    return { pickupCode: null, cardId: upper };
  }

  if (upper.startsWith("EMZ-")) {
    return { pickupCode: upper, cardId: null };
  }

  return { pickupCode: null, cardId: null };
}

export function lookupKitchenReservation(
  raw: string,
  dateKey: string,
  mealType: MealType,
): KitchenReservationRecord | null {
  const { pickupCode, cardId } = normalizeLookupInput(raw);
  if (!pickupCode && !cardId) {
    return null;
  }

  const reservations = getAllKitchenReservationsForMeal(dateKey, mealType).filter(
    (entry) => entry.status !== "iskorisceno",
  );

  if (pickupCode) {
    return (
      reservations.find(
        (entry) => entry.pickupCode?.toUpperCase() === pickupCode,
      ) ?? null
    );
  }

  return (
    reservations.find((entry) => entry.cardId?.toUpperCase() === cardId) ?? null
  );
}

export function getPrepCounts(dateKey: string, mealType: MealType): PrepSummary {
  const reservations = getKitchenReservationsForMeal(dateKey, mealType);
  const counts = new Map<string, PrepCountRow>();
  const slotOrdererCounts: Record<KitchenMenuSlotId, number> = {
    main: 0,
    side: 0,
    salad: 0,
    dessert: 0,
  };

  for (const reservation of reservations) {
    for (const slotId of kitchenSlotOrder) {
      const field = kitchenSlotToMealField[slotId];
      const slotValue = reservation.items[field];
      const parsed = parseSlotDishes(slotValue).filter((dish) => dish.name && dish.quantity > 0);

      if (parsed.length === 0) {
        continue;
      }

      slotOrdererCounts[slotId] += 1;

      const seenDishes = new Set<string>();
      for (const { name, quantity } of parsed) {
        const key = `${slotId}:${name}`;
        const existing = counts.get(key);

        if (existing) {
          existing.count += quantity;
          if (!seenDishes.has(name)) {
            existing.ordererCount += 1;
            seenDishes.add(name);
          }
        } else {
          counts.set(key, {
            dishName: name,
            slot: slotId,
            slotLabel: kitchenSlotLabels[slotId],
            count: quantity,
            ordererCount: 1,
          });
          seenDishes.add(name);
        }
      }
    }
  }

  const rows = Array.from(counts.values()).sort((a, b) => {
    const slotOrder = kitchenSlotOrder.indexOf(a.slot) - kitchenSlotOrder.indexOf(b.slot);
    if (slotOrder !== 0) {
      return slotOrder;
    }
    return b.count - a.count;
  });

  const menuDishes = getMenuDishNames(dateKey, mealType);

  return {
    orderCount: reservations.length,
    totalPortions: rows.reduce((sum, row) => sum + row.count, 0),
    rows,
    menuDishes,
    slotOrdererCounts,
  };
}

export function getPrepDetailSummary(dateKey: string, mealType: MealType): PrepDetailSummary {
  const summary = getPrepCounts(dateKey, mealType);
  const fastingCount = getFastingReservationCount(dateKey, mealType);

  const rowsBySlot = kitchenSlotOrder.map((slotId) => {
    const slotOrdererCount = summary.slotOrdererCounts[slotId];
    const slotRows: PrepDetailRow[] = summary.rows
      .filter((row) => row.slot === slotId)
      .map((row) => {
        const portionWeightGrams = resolvePortionWeightGrams(row.dishName, row.slot);
        const orderSharePercent =
          slotOrdererCount > 0 ? Math.round((row.ordererCount / slotOrdererCount) * 100) : 0;

        return {
          ...row,
          portionWeightGrams,
          totalGrams: row.count * portionWeightGrams,
          orderSharePercent,
          badges: resolveDishBadges(row.dishName),
        };
      });

    return {
      slotId,
      label: kitchenSlotLabels[slotId],
      rows: slotRows,
      totalPortions: slotRows.reduce((sum, row) => sum + row.count, 0),
      totalGrams: slotRows.reduce((sum, row) => sum + row.totalGrams, 0),
      ordererCount: slotOrdererCount,
    };
  });

  const detailRows = rowsBySlot.flatMap((slot) => slot.rows);

  const rawReservations = getKitchenReservationsForMeal(dateKey, mealType);
  const reservations = rawReservations.map((r) => ({
    glavnoJelo: r.items.glavnoJelo ?? "",
    dodatak: r.items.dodatak ?? "",
    salata: r.items.salata ?? "",
    obrok: r.items.obrok ?? "",
  }));

  return {
    ...summary,
    detailRows,
    totalGrams: detailRows.reduce((sum, row) => sum + row.totalGrams, 0),
    rowsBySlot,
    fastingCount,
    reservations,
  };
}
