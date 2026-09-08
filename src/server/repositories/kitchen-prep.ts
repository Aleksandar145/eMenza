import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db";
import { mealReservations, dishRecipes } from "@/server/db/schema";
import {
  kitchenSlotOrder,
  kitchenSlotToMealField,
  kitchenSlotLabels,
  type KitchenMenuSlotId,
} from "@/lib/kuhinja-mock";
import { parseSlotDishes } from "@/lib/kuhinja-order-display";
import { defaultPortionWeightGramsByCategory } from "@/lib/dish-catalog-mock";
import { fetchDishCatalogState } from "@/server/repositories/dishes";
import type { MealType } from "@/lib/meal-types";

export type PrepCountRow = {
  dishName: string;
  slot: KitchenMenuSlotId;
  slotLabel: string;
  count: number;
  ordererCount: number;
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

export type PrepDetailSummary = {
  orderCount: number;
  totalPortions: number;
  rows: PrepCountRow[];
  menuDishes: string[];
  slotOrdererCounts: Record<KitchenMenuSlotId, number>;
  detailRows: PrepDetailRow[];
  totalGrams: number;
  rowsBySlot: PrepDetailSlotGroup[];
  fastingCount: number;
  reservations: ReservationDishFields[];
};

export async function getKitchenPrepDb(
  dateKey: string,
  mealType: MealType,
): Promise<PrepDetailSummary> {
  const db = getDb();

  const rows = await db
    .select({
      glavnoJelo: mealReservations.glavnoJelo,
      dodatak: mealReservations.dodatak,
      salata: mealReservations.salata,
      obrok: mealReservations.obrok,
      isPosno: mealReservations.isPosno,
    })
    .from(mealReservations)
    .where(
      and(
        eq(mealReservations.dateKey, dateKey),
        eq(mealReservations.mealType, mealType),
        inArray(mealReservations.status, ["zakazano", "aktivno"]),
      ),
    );

  if (rows.length === 0) {
    return {
      orderCount: 0,
      totalPortions: 0,
      rows: [],
      menuDishes: [],
      slotOrdererCounts: { main: 0, side: 0, salad: 0, dessert: 0 },
      detailRows: [],
      totalGrams: 0,
      rowsBySlot: [],
      fastingCount: 0,
      reservations: [],
    };
  }

  const dishCounts = new Map<string, PrepCountRow>();
  const slotOrdererCounts: Record<KitchenMenuSlotId, number> = {
    main: 0,
    side: 0,
    salad: 0,
    dessert: 0,
  };

  for (const row of rows) {
    for (const slotId of kitchenSlotOrder) {
      const field = kitchenSlotToMealField[slotId];
      const rawValue = row[field];
      const parsed = parseSlotDishes(rawValue).filter(
        (dish) => dish.name && dish.quantity > 0,
      );

      if (parsed.length === 0) continue;

      slotOrdererCounts[slotId] += 1;

      const seenDishes = new Set<string>();
      for (const { name, quantity } of parsed) {
        const key = `${slotId}:${name}`;
        const existing = dishCounts.get(key);

        if (existing) {
          existing.count += quantity;
          if (!seenDishes.has(name)) {
            existing.ordererCount += 1;
            seenDishes.add(name);
          }
        } else {
          dishCounts.set(key, {
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

  const fastingCount = rows.filter((row) => row.isPosno).length;

  const sortedRows = Array.from(dishCounts.values()).sort((a, b) => {
    const slotOrder =
      kitchenSlotOrder.indexOf(a.slot) - kitchenSlotOrder.indexOf(b.slot);
    if (slotOrder !== 0) return slotOrder;
    return b.count - a.count;
  });

  const totalPortions = sortedRows.reduce((sum, r) => sum + r.count, 0);

  const catalog = await fetchDishCatalogState();
  const badgesByName = new Map<string, string[]>();
  for (const dish of catalog.dishes) {
    badgesByName.set(dish.name.trim().toLowerCase(), [...(dish.badges ?? [])]);
  }

  const recipeRows = await db
    .select({
      dishName: dishRecipes.dishName,
      totalGramsPerPortion: dishRecipes.totalGramsPerPortion,
    })
    .from(dishRecipes);
  const recipeWeightByName = new Map<string, number>();
  for (const r of recipeRows) {
    if (r.totalGramsPerPortion && Number(r.totalGramsPerPortion) > 0) {
      recipeWeightByName.set(r.dishName.trim().toLowerCase(), Number(r.totalGramsPerPortion));
    }
  }

  const rowsBySlot: PrepDetailSlotGroup[] = kitchenSlotOrder.map((slotId) => {
    const slotOrdererCount = slotOrdererCounts[slotId];
    const slotRows: PrepDetailRow[] = sortedRows
      .filter((r) => r.slot === slotId)
      .map((r) => {
        const portionWeightGrams =
          recipeWeightByName.get(r.dishName.trim().toLowerCase()) ??
          defaultPortionWeightGramsByCategory[r.slot];
        const orderSharePercent =
          slotOrdererCount > 0
            ? Math.round((r.ordererCount / slotOrdererCount) * 100)
            : 0;
        return {
          ...r,
          portionWeightGrams,
          totalGrams: r.count * portionWeightGrams,
          orderSharePercent,
          badges: badgesByName.get(r.dishName.trim().toLowerCase()) ?? [],
        };
      });

    return {
      slotId,
      label: kitchenSlotLabels[slotId],
      rows: slotRows,
      totalPortions: slotRows.reduce((sum, r) => sum + r.count, 0),
      totalGrams: slotRows.reduce((sum, r) => sum + r.totalGrams, 0),
      ordererCount: slotOrdererCount,
    };
  });

  const detailRows = rowsBySlot.flatMap((s) => s.rows);

  return {
    orderCount: rows.length,
    totalPortions,
    rows: sortedRows,
    menuDishes: [],
    slotOrdererCounts,
    detailRows,
    totalGrams: detailRows.reduce((sum, r) => sum + r.totalGrams, 0),
    rowsBySlot,
    fastingCount,
    reservations: rows.map((r) => ({
      glavnoJelo: r.glavnoJelo,
      dodatak: r.dodatak,
      salata: r.salata,
      obrok: r.obrok,
    })),
  };
}
