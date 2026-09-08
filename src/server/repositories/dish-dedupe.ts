import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db";
import { dailyMenuSlotDishes, dishes } from "@/server/db/schema";

export type DishDedupeResult = {
  duplicateGroups: number;
  dishesRemoved: number;
  menuRowsUpdated: number;
  menuRowsRemoved: number;
  dishesRemaining: number;
};

function dishGroupKey(name: string, category: string) {
  return `${category}::${name.trim().toLowerCase()}`;
}

export async function dedupeDishesDb(): Promise<DishDedupeResult> {
  const db = getDb();
  const allDishes = await db.select().from(dishes).orderBy(dishes.createdAt);

  const canonicalByKey = new Map<string, string>();
  const duplicateToCanonical = new Map<string, string>();
  let duplicateGroups = 0;

  for (const dish of allDishes) {
    const key = dishGroupKey(dish.name, dish.category);
    const canonicalId = canonicalByKey.get(key);

    if (!canonicalId) {
      canonicalByKey.set(key, dish.id);
      continue;
    }

    duplicateToCanonical.set(dish.id, canonicalId);
    duplicateGroups += 1;
  }

  if (duplicateToCanonical.size === 0) {
    const menuDedupe = await dedupeMenuSlotDishesDb();
    const orphanRowsRemoved = await pruneOrphanMenuDishesDb();
    return {
      duplicateGroups: 0,
      dishesRemoved: 0,
      menuRowsUpdated: menuDedupe.rowsUpdated,
      menuRowsRemoved: menuDedupe.rowsRemoved + orphanRowsRemoved,
      dishesRemaining: allDishes.length,
    };
  }

  const duplicateIds = [...duplicateToCanonical.keys()];
  const slotRows = await db
    .select()
    .from(dailyMenuSlotDishes)
    .where(inArray(dailyMenuSlotDishes.dishId, duplicateIds));

  let menuRowsUpdated = 0;
  let menuRowsRemoved = 0;

  for (const row of slotRows) {
    const canonicalId = duplicateToCanonical.get(row.dishId);
    if (!canonicalId) {
      continue;
    }

    const [existingCanonical] = await db
      .select()
      .from(dailyMenuSlotDishes)
      .where(
        and(
          eq(dailyMenuSlotDishes.slotRowId, row.slotRowId),
          eq(dailyMenuSlotDishes.dishId, canonicalId),
        ),
      )
      .limit(1);

    if (existingCanonical) {
      await db.delete(dailyMenuSlotDishes).where(eq(dailyMenuSlotDishes.id, row.id));
      menuRowsRemoved += 1;
      continue;
    }

    await db
      .update(dailyMenuSlotDishes)
      .set({ dishId: canonicalId })
      .where(eq(dailyMenuSlotDishes.id, row.id));
    menuRowsUpdated += 1;
  }

  await db.delete(dishes).where(inArray(dishes.id, duplicateIds));

  const menuDedupe = await dedupeMenuSlotDishesDb();
  menuRowsUpdated += menuDedupe.rowsUpdated;
  menuRowsRemoved += menuDedupe.rowsRemoved;

  const orphanRowsRemoved = await pruneOrphanMenuDishesDb();
  menuRowsRemoved += orphanRowsRemoved;

  const remaining = await db.select({ id: dishes.id }).from(dishes);

  return {
    duplicateGroups,
    dishesRemoved: duplicateIds.length,
    menuRowsUpdated,
    menuRowsRemoved,
    dishesRemaining: remaining.length,
  };
}

async function dedupeMenuSlotDishesDb() {
  const db = getDb();
  const allRows = await db.select().from(dailyMenuSlotDishes);

  const seen = new Map<string, string>();
  let rowsRemoved = 0;

  for (const row of allRows) {
    const key = `${row.slotRowId}::${row.dishId}`;
    if (!seen.has(key)) {
      seen.set(key, row.id);
      continue;
    }

    await db.delete(dailyMenuSlotDishes).where(eq(dailyMenuSlotDishes.id, row.id));
    rowsRemoved += 1;
  }

  return { rowsUpdated: 0, rowsRemoved };
}

export async function pruneOrphanMenuDishesDb() {
  const db = getDb();
  const validDishes = await db.select({ id: dishes.id }).from(dishes);
  const validIds = new Set(validDishes.map((row) => row.id));
  const slotRows = await db.select().from(dailyMenuSlotDishes);

  let rowsRemoved = 0;

  for (const row of slotRows) {
    if (validIds.has(row.dishId)) {
      continue;
    }

    await db.delete(dailyMenuSlotDishes).where(eq(dailyMenuSlotDishes.id, row.id));
    rowsRemoved += 1;
  }

  return rowsRemoved;
}

export async function getValidDishIdSet() {
  const db = getDb();
  const rows = await db.select({ id: dishes.id }).from(dishes);
  return new Set(rows.map((row) => row.id));
}

export async function filterValidDishIds(dishIds: string[]) {
  const validIds = await getValidDishIdSet();
  return [...new Set(dishIds.filter((id) => validIds.has(id)))];
}
