import { eq, ilike, inArray } from "drizzle-orm";
import type { Dish, DishCatalogState } from "@/lib/dish-catalog-mock";
import { defaultPortionWeightGramsByCategory } from "@/lib/dish-catalog-mock";
import { getDb } from "@/server/db";
import { dishes } from "@/server/db/schema";

function mapDish(row: typeof dishes.$inferSelect): Dish {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    priceRsd: row.priceRsd,
    portionWeightGrams: defaultPortionWeightGramsByCategory[row.category],
    imageUrl: row.imageUrl,
    badges: (row.badges ?? []) as Dish["badges"],
    status: row.status,
    proposedBy: (row.proposedBy as Dish["proposedBy"]) ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function fetchDishCatalogState(): Promise<DishCatalogState> {
  const db = getDb();
  const rows = await db.select().from(dishes).orderBy(dishes.name);
  const seen = new Map<string, Dish>();

  for (const row of rows) {
    const dish = mapDish(row);
    const key = `${dish.category}::${dish.name.trim().toLowerCase()}`;
    const existing = seen.get(key);
    if (!existing || (existing.status !== "active" && dish.status === "active")) {
      seen.set(key, dish);
    }
  }

  return { dishes: [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, "sr")) };
}

export async function upsertDishDb(dish: Omit<Dish, "createdAt" | "updatedAt"> & { id?: string }) {
  const db = getDb();
  const now = new Date();

  if (dish.id) {
    const [updated] = await db
      .update(dishes)
      .set({
        name: dish.name,
        category: dish.category,
        priceRsd: dish.priceRsd,
        imageUrl: dish.imageUrl,
        badges: dish.badges,
        status: dish.status,
        proposedBy: dish.proposedBy ?? null,
        updatedAt: now,
      })
      .where(eq(dishes.id, dish.id))
      .returning();
    return mapDish(updated);
  }

  const [created] = await db
    .insert(dishes)
    .values({
      name: dish.name,
      category: dish.category,
      priceRsd: dish.priceRsd,
      imageUrl: dish.imageUrl,
      badges: dish.badges,
      status: dish.status,
      proposedBy: dish.proposedBy ?? null,
    })
    .returning();

  return mapDish(created);
}

export async function deleteDishDb(id: string) {
  const db = getDb();
  await db.delete(dishes).where(eq(dishes.id, id));
}

export async function getDishesByIdsDb(ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return [];
  }

  const db = getDb();
  const rows = await db.select().from(dishes).where(inArray(dishes.id, uniqueIds));
  const dishMap = new Map(rows.map((row) => [row.id, mapDish(row)]));
  return uniqueIds.map((id) => dishMap.get(id)).filter((dish): dish is Dish => Boolean(dish));
}

export async function findDishByName(name: string) {
  const db = getDb();
  const normalized = name.replace(/\s×\s*\d+$/i, "").trim();
  const [row] = await db
    .select()
    .from(dishes)
    .where(ilike(dishes.name, normalized))
    .limit(1);
  return row ? mapDish(row) : null;
}
