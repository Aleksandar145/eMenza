import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  mealReservations,
  dishRecipes,
  dishRecipeEntries,
  recipeAppliedDates,
} from "@/server/db/schema";
import {
  kitchenSlotOrder,
  kitchenSlotToMealField,
} from "@/lib/kuhinja-mock";
import { parseSlotDishes } from "@/lib/kuhinja-order-display";
import type { DishDemand, DishRecipe, DishRecipeEntry, RecipeState } from "@/lib/magacin-recipe-mock";
import type { MealType } from "@/lib/meal-types";

function num(v: string | null): number {
  return v ? Number(v) : 0;
}

function mapEntry(row: typeof dishRecipeEntries.$inferSelect): DishRecipeEntry {
  return {
    id: `entry-${row.id}`,
    ingredientId: row.ingredientId ?? undefined,
    ingredientName: row.ingredientName,
    unit: row.unit as DishRecipeEntry["unit"],
    perServing: num(row.perServing),
    used: row.used,
  };
}

export async function fetchRecipeState(): Promise<RecipeState> {
  const db = getDb();

  const recipeRows = await db.select().from(dishRecipes).orderBy(dishRecipes.dishName);
  const appliedRows = await db.select({ dateKey: recipeAppliedDates.dateKey }).from(recipeAppliedDates);

  const entriesByRecipe = new Map<string, DishRecipeEntry[]>();
  if (recipeRows.length > 0) {
    const entryRows = await db
      .select()
      .from(dishRecipeEntries)
      .where(
        inArray(
          dishRecipeEntries.recipeId,
          recipeRows.map((r) => r.id),
        ),
      );
    for (const row of entryRows) {
      const list = entriesByRecipe.get(row.recipeId) ?? [];
      list.push(mapEntry(row));
      entriesByRecipe.set(row.recipeId, list);
    }
  }

  const recipes: DishRecipe[] = recipeRows.map((row) => ({
    dishName: row.dishName,
    entries: entriesByRecipe.get(row.id) ?? [],
    updatedAt: row.updatedAt.toISOString(),
    totalGramsPerPortion: row.totalGramsPerPortion
      ? Number(row.totalGramsPerPortion)
      : undefined,
  }));

  return {
    recipes,
    appliedDates: appliedRows.map((r) => r.dateKey),
  };
}

export async function upsertRecipeDb(
  dishName: string,
  entries: Array<Omit<DishRecipeEntry, "id">>,
  totalGramsPerPortion?: number,
): Promise<RecipeState> {
  const db = getDb();

  const [existing] = await db
    .select({ id: dishRecipes.id })
    .from(dishRecipes)
    .where(eq(dishRecipes.dishName, dishName))
    .limit(1);

  let recipeId = existing?.id;

  if (!recipeId) {
    const [created] = await db
      .insert(dishRecipes)
      .values({
        dishName,
        totalGramsPerPortion: totalGramsPerPortion
          ? String(totalGramsPerPortion)
          : null,
      })
      .returning({ id: dishRecipes.id });
    recipeId = created.id;
  } else {
    await db
      .update(dishRecipes)
      .set({
        updatedAt: new Date(),
        totalGramsPerPortion: totalGramsPerPortion
          ? String(totalGramsPerPortion)
          : null,
      })
      .where(eq(dishRecipes.id, recipeId));
  }

  await db.delete(dishRecipeEntries).where(eq(dishRecipeEntries.recipeId, recipeId));

  for (const entry of entries) {
    await db.insert(dishRecipeEntries).values({
      recipeId,
      ingredientId: entry.ingredientId ?? null,
      ingredientName: entry.ingredientName,
      unit: entry.unit,
      perServing: String(entry.perServing),
      used: entry.used,
    });
  }

  return fetchRecipeState();
}

export async function deleteRecipeDb(dishName: string): Promise<RecipeState> {
  const db = getDb();
  await db.delete(dishRecipes).where(eq(dishRecipes.dishName, dishName));
  return fetchRecipeState();
}

export async function markAppliedDate(dateKey: string): Promise<RecipeState> {
  const db = getDb();
  await db
    .insert(recipeAppliedDates)
    .values({ dateKey })
    .onConflictDoNothing();
  return fetchRecipeState();
}

export async function getDemandForDate(
  dateKey: string,
  mealType: MealType,
): Promise<{ demand: DishDemand[]; totalServings: number }> {
  const db = getDb();

  const rows = await db
    .select({
      glavnoJelo: mealReservations.glavnoJelo,
      dodatak: mealReservations.dodatak,
      salata: mealReservations.salata,
      obrok: mealReservations.obrok,
    })
    .from(mealReservations)
    .where(
      and(
        eq(mealReservations.dateKey, dateKey),
        eq(mealReservations.mealType, mealType),
        inArray(mealReservations.status, ["zakazano", "aktivno"]),
      ),
    );

  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const slotId of kitchenSlotOrder) {
      const field = kitchenSlotToMealField[slotId];
      const parsed = parseSlotDishes(row[field]).filter(
        (d) => d.name && d.quantity > 0,
      );
      for (const { name, quantity } of parsed) {
        const key = name.toLowerCase();
        counts.set(key, (counts.get(key) ?? 0) + quantity);
      }
    }
  }

  const demand: DishDemand[] = Array.from(counts.entries()).map(([key, servings]) => ({
    dishName: key,
    servings,
  }));

  const totalServings = demand.reduce((s, d) => s + d.servings, 0);
  return { demand, totalServings };
}
