import { and, eq, gte, inArray, lte } from "drizzle-orm";
import type {
  DailyMenuEntry,
  DailyMenuSlot,
  KitchenMenuSlotId,
  KuhinjaJelovnikState,
} from "@/lib/kuhinja-mock";
import { DEFAULT_DISH_STOCK, kitchenSlotOrder } from "@/lib/kuhinja-mock";
import type { MealType } from "@/lib/meal-types";
import { getDb } from "@/server/db";
import {
  filterValidDishIds,
  getValidDishIdSet,
} from "@/server/repositories/dish-dedupe";
import { getDishesByIdsDb } from "@/server/repositories/dishes";
import {
  dailyMenuSlotDishes,
  dailyMenuSlots,
  dailyMenus,
  dishes,
} from "@/server/db/schema";

async function loadMenuEntry(
  dateKey: string,
  mealType: MealType,
): Promise<DailyMenuEntry | null> {
  const db = getDb();
  const [menu] = await db
    .select()
    .from(dailyMenus)
    .where(and(eq(dailyMenus.dateKey, dateKey), eq(dailyMenus.mealType, mealType)))
    .limit(1);

  if (!menu) {
    return null;
  }

  const slotRows = await db
    .select()
    .from(dailyMenuSlots)
    .where(eq(dailyMenuSlots.menuId, menu.id));

  const slotRowIds = slotRows.map((row) => row.id);
  const dishRows =
    slotRowIds.length > 0
      ? await db
          .select({
            slotRowId: dailyMenuSlotDishes.slotRowId,
            dishId: dailyMenuSlotDishes.dishId,
            stock: dailyMenuSlotDishes.stock,
          })
          .from(dailyMenuSlotDishes)
          .where(inArray(dailyMenuSlotDishes.slotRowId, slotRowIds))
      : [];

  const dishesBySlotRowId = new Map<string, (typeof dishRows)[number][]>();
  for (const row of dishRows) {
    const list = dishesBySlotRowId.get(row.slotRowId) ?? [];
    list.push(row);
    dishesBySlotRowId.set(row.slotRowId, list);
  }

  const slots: DailyMenuSlot[] = kitchenSlotOrder.map((slotId) => {
    const slotRow = slotRows.find((row) => row.slotId === slotId);
    if (!slotRow) {
      return { slotId, dishIds: [], dishStock: {} };
    }

    const slotDishRows = dishesBySlotRowId.get(slotRow.id) ?? [];
    const dishIds = slotDishRows.map((row) => row.dishId);
    const dishStock = Object.fromEntries(
      slotDishRows.map((row) => [row.dishId, row.stock]),
    ) as Record<string, number>;

    return { slotId, dishIds, dishStock };
  });

  return {
    id: menu.id,
    dateKey: menu.dateKey,
    mealType: menu.mealType as MealType,
    slots,
    published: menu.published,
    updatedAt: menu.updatedAt.toISOString(),
  };
}

export async function fetchPublishedMenuEntry(dateKey: string, mealType: MealType) {
  const menu = await loadMenuEntry(dateKey, mealType);
  if (!menu?.published) {
    return { menu: null, dishes: [] as Awaited<ReturnType<typeof getDishesByIdsDb>> };
  }

  const dishIds = menu.slots.flatMap((slot) => slot.dishIds);
  const menuDishes = await getDishesByIdsDb(dishIds);

  return { menu, dishes: menuDishes };
}

export type JelovnikFetchRange = {
  fromDateKey?: string;
  toDateKey?: string;
};

export async function fetchJelovnikState(
  range?: JelovnikFetchRange,
): Promise<KuhinjaJelovnikState> {
  const db = getDb();
  const rangeFilters = [];
  if (range?.fromDateKey) {
    rangeFilters.push(gte(dailyMenus.dateKey, range.fromDateKey));
  }
  if (range?.toDateKey) {
    rangeFilters.push(lte(dailyMenus.dateKey, range.toDateKey));
  }

  const menuRows =
    rangeFilters.length > 0
      ? await db
          .select()
          .from(dailyMenus)
          .where(and(...rangeFilters))
      : await db.select().from(dailyMenus);
  if (menuRows.length === 0) {
    return { menus: [] };
  }

  const menuIds = menuRows.map((menu) => menu.id);
  const slotRows = await db
    .select()
    .from(dailyMenuSlots)
    .where(inArray(dailyMenuSlots.menuId, menuIds));

  const slotRowIds = slotRows.map((slot) => slot.id);
  const dishRows =
    slotRowIds.length > 0
      ? await db
          .select({
            slotRowId: dailyMenuSlotDishes.slotRowId,
            dishId: dailyMenuSlotDishes.dishId,
            stock: dailyMenuSlotDishes.stock,
          })
          .from(dailyMenuSlotDishes)
          .where(inArray(dailyMenuSlotDishes.slotRowId, slotRowIds))
      : [];

  const slotsByMenuId = new Map<string, (typeof slotRows)[number][]>();
  for (const slot of slotRows) {
    const list = slotsByMenuId.get(slot.menuId) ?? [];
    list.push(slot);
    slotsByMenuId.set(slot.menuId, list);
  }

  const dishesBySlotRowId = new Map<string, (typeof dishRows)[number][]>();
  for (const row of dishRows) {
    const list = dishesBySlotRowId.get(row.slotRowId) ?? [];
    list.push(row);
    dishesBySlotRowId.set(row.slotRowId, list);
  }

  const entries: DailyMenuEntry[] = menuRows.map((menu) => {
    const menuSlots = slotsByMenuId.get(menu.id) ?? [];
    const slots: DailyMenuSlot[] = kitchenSlotOrder.map((slotId) => {
      const slotRow = menuSlots.find((row) => row.slotId === slotId);
      if (!slotRow) {
        return { slotId, dishIds: [], dishStock: {} };
      }

      const slotDishes = dishesBySlotRowId.get(slotRow.id) ?? [];
      const dishIds = slotDishes.map((row) => row.dishId);
      const dishStock = Object.fromEntries(
        slotDishes.map((row) => [row.dishId, row.stock]),
      ) as Record<string, number>;

      return { slotId, dishIds, dishStock };
    });

    return {
      id: menu.id,
      dateKey: menu.dateKey,
      mealType: menu.mealType as MealType,
      slots,
      published: menu.published,
      updatedAt: menu.updatedAt.toISOString(),
    };
  });

  return { menus: entries };
}

export async function ensureDailyMenuDb(dateKey: string, mealType: MealType) {
  const existing = await loadMenuEntry(dateKey, mealType);
  if (existing) {
    return existing;
  }

  const db = getDb();
  const [menu] = await db
    .insert(dailyMenus)
    .values({ dateKey, mealType, published: false })
    .returning();

  for (const slotId of kitchenSlotOrder) {
    await db.insert(dailyMenuSlots).values({ menuId: menu.id, slotId });
  }

  return loadMenuEntry(dateKey, mealType);
}

export async function setSlotDishIdsDb(
  dateKey: string,
  mealType: MealType,
  slotId: KitchenMenuSlotId,
  dishIds: string[],
  previousStock?: Record<string, number>,
) {
  const menu = await ensureDailyMenuDb(dateKey, mealType);
  const db = getDb();
  const uniqueDishIds = [...new Set(dishIds.filter(Boolean))];
  const validDishIds = await filterValidDishIds(uniqueDishIds);

  const [slotRow] = await db
    .select()
    .from(dailyMenuSlots)
    .where(and(eq(dailyMenuSlots.menuId, menu!.id), eq(dailyMenuSlots.slotId, slotId)))
    .limit(1);

  if (!slotRow) {
    throw new Error("Slot not found");
  }

  await db.transaction(async (tx) => {
    const currentRows = await tx
      .select()
      .from(dailyMenuSlotDishes)
      .where(eq(dailyMenuSlotDishes.slotRowId, slotRow.id));

    const currentIds = new Set(currentRows.map((row) => row.dishId));
    const nextIds = new Set(validDishIds);

    for (const row of currentRows) {
      if (!nextIds.has(row.dishId)) {
        await tx.delete(dailyMenuSlotDishes).where(eq(dailyMenuSlotDishes.id, row.id));
      }
    }

    for (const dishId of validDishIds) {
      if (currentIds.has(dishId)) {
        continue;
      }

      await tx.insert(dailyMenuSlotDishes).values({
        slotRowId: slotRow.id,
        dishId,
        stock: previousStock?.[dishId] ?? DEFAULT_DISH_STOCK,
      });
    }

    await tx
      .update(dailyMenus)
      .set({ updatedAt: new Date() })
      .where(eq(dailyMenus.id, menu!.id));
  });

  return loadMenuEntry(dateKey, mealType);
}

export async function toggleSlotDishDb(
  dateKey: string,
  mealType: MealType,
  slotId: KitchenMenuSlotId,
  dishId: string,
  selected: boolean,
) {
  const menu = await ensureDailyMenuDb(dateKey, mealType);
  const db = getDb();

  const [dish] = await db.select({ id: dishes.id }).from(dishes).where(eq(dishes.id, dishId)).limit(1);
  if (!dish) {
    if (!selected) {
      return loadMenuEntry(dateKey, mealType);
    }
    throw new Error("Jelo nije dostupno u katalogu.");
  }

  const [slotRow] = await db
    .select()
    .from(dailyMenuSlots)
    .where(and(eq(dailyMenuSlots.menuId, menu!.id), eq(dailyMenuSlots.slotId, slotId)))
    .limit(1);

  if (!slotRow) {
    throw new Error("Slot not found");
  }

  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(dailyMenuSlotDishes)
      .where(
        and(
          eq(dailyMenuSlotDishes.slotRowId, slotRow.id),
          eq(dailyMenuSlotDishes.dishId, dishId),
        ),
      )
      .limit(1);

    if (selected) {
      if (!existing) {
        await tx.insert(dailyMenuSlotDishes).values({
          slotRowId: slotRow.id,
          dishId,
          stock: DEFAULT_DISH_STOCK,
        });
      }
    } else if (existing) {
      await tx.delete(dailyMenuSlotDishes).where(eq(dailyMenuSlotDishes.id, existing.id));
    }

    await tx
      .update(dailyMenus)
      .set({ updatedAt: new Date() })
      .where(eq(dailyMenus.id, menu!.id));
  });

  return loadMenuEntry(dateKey, mealType);
}

export async function setSlotDishStockDb(
  dateKey: string,
  mealType: MealType,
  slotId: KitchenMenuSlotId,
  dishId: string,
  stock: number,
) {
  const menu = await ensureDailyMenuDb(dateKey, mealType);
  const db = getDb();

  const [slotRow] = await db
    .select()
    .from(dailyMenuSlots)
    .where(and(eq(dailyMenuSlots.menuId, menu!.id), eq(dailyMenuSlots.slotId, slotId)))
    .limit(1);

  if (!slotRow) {
    throw new Error("Slot not found");
  }

  await db
    .update(dailyMenuSlotDishes)
    .set({ stock: Math.max(0, stock) })
    .where(
      and(
        eq(dailyMenuSlotDishes.slotRowId, slotRow.id),
        eq(dailyMenuSlotDishes.dishId, dishId),
      ),
    );

  return loadMenuEntry(dateKey, mealType);
}

export async function toggleDailyMenuPublishedDb(
  dateKey: string,
  mealType: MealType,
  published: boolean,
) {
  const db = getDb();
  await db
    .update(dailyMenus)
    .set({ published, updatedAt: new Date() })
    .where(and(eq(dailyMenus.dateKey, dateKey), eq(dailyMenus.mealType, mealType)));

  return loadMenuEntry(dateKey, mealType);
}

async function publishMenuDbWithValidDishSet(
  dateKey: string,
  mealType: MealType,
  slots: DailyMenuSlot[],
  published: boolean,
  validDishIdSet: Set<string>,
) {
  const menu = await ensureDailyMenuDb(dateKey, mealType);
  const db = getDb();

  await db.transaction(async (tx) => {
    for (const slotId of kitchenSlotOrder) {
      const slot = slots.find((entry) => entry.slotId === slotId) ?? {
        slotId,
        dishIds: [],
        dishStock: {},
      };
      const validIds = [...new Set(slot.dishIds.filter((id) => validDishIdSet.has(id)))];

      const [slotRow] = await tx
        .select()
        .from(dailyMenuSlots)
        .where(and(eq(dailyMenuSlots.menuId, menu!.id), eq(dailyMenuSlots.slotId, slotId)))
        .limit(1);

      if (!slotRow) {
        continue;
      }

      await tx.delete(dailyMenuSlotDishes).where(eq(dailyMenuSlotDishes.slotRowId, slotRow.id));

      for (const dishId of validIds) {
        await tx.insert(dailyMenuSlotDishes).values({
          slotRowId: slotRow.id,
          dishId,
          stock: slot.dishStock[dishId] ?? DEFAULT_DISH_STOCK,
        });
      }
    }

    await tx
      .update(dailyMenus)
      .set({ published, updatedAt: new Date() })
      .where(eq(dailyMenus.id, menu!.id));
  });

  return loadMenuEntry(dateKey, mealType);
}

export async function publishMenuDb(
  dateKey: string,
  mealType: MealType,
  slots: DailyMenuSlot[],
  published: boolean,
) {
  const validDishIdSet = await getValidDishIdSet();
  return publishMenuDbWithValidDishSet(dateKey, mealType, slots, published, validDishIdSet);
}

export async function publishScheduleMenusDb(
  meals: Array<{ dateKey: string; mealType: MealType; slots: DailyMenuSlot[] }>,
) {
  if (meals.length === 0) {
    return [];
  }

  const validDishIdSet = await getValidDishIdSet();
  const publishedMenus: DailyMenuEntry[] = [];

  for (const meal of meals) {
    const entry = await publishMenuDbWithValidDishSet(
      meal.dateKey,
      meal.mealType,
      meal.slots,
      true,
      validDishIdSet,
    );
    if (entry) {
      publishedMenus.push(entry);
    }
  }

  return publishedMenus;
}

export async function copyMenuFromDateDb(
  sourceDateKey: string,
  targetDateKey: string,
  mealType: MealType,
) {
  const source = await loadMenuEntry(sourceDateKey, mealType);
  if (!source) {
    return null;
  }

  const target = await ensureDailyMenuDb(targetDateKey, mealType);
  const db = getDb();

  await db
    .update(dailyMenus)
    .set({ published: false, updatedAt: new Date() })
    .where(eq(dailyMenus.id, target!.id));

  for (const slot of source.slots) {
    const validIds = await filterValidDishIds(slot.dishIds);
    if (validIds.length === 0) {
      await setSlotDishIdsDb(targetDateKey, mealType, slot.slotId, [], {});
      continue;
    }

    await setSlotDishIdsDb(
      targetDateKey,
      mealType,
      slot.slotId,
      validIds,
      slot.dishStock,
    );
  }

  return loadMenuEntry(targetDateKey, mealType);
}

export async function decrementDishStockDb(
  dateKey: string,
  mealType: MealType,
  dishId: string,
  quantity = 1,
) {
  const menu = await loadMenuEntry(dateKey, mealType);
  if (!menu?.published) {
    throw new Error("Menu not published");
  }

  const db = getDb();
  const [menuRow] = await db
    .select()
    .from(dailyMenus)
    .where(and(eq(dailyMenus.dateKey, dateKey), eq(dailyMenus.mealType, mealType)))
    .limit(1);

  if (!menuRow) {
    throw new Error("Menu not found");
  }

  for (const slot of menu.slots) {
    if (!slot.dishIds.includes(dishId)) {
      continue;
    }

    const currentStock = slot.dishStock[dishId] ?? 0;
    if (currentStock < quantity) {
      throw new Error("Nema dovoljno porcija za izabrano jelo.");
    }

    const [slotRow] = await db
      .select()
      .from(dailyMenuSlots)
      .where(and(eq(dailyMenuSlots.menuId, menuRow.id), eq(dailyMenuSlots.slotId, slot.slotId)))
      .limit(1);

    if (!slotRow) {
      continue;
    }

    await db
      .update(dailyMenuSlotDishes)
      .set({ stock: currentStock - quantity })
      .where(
        and(
          eq(dailyMenuSlotDishes.slotRowId, slotRow.id),
          eq(dailyMenuSlotDishes.dishId, dishId),
        ),
      );

    return;
  }

  throw new Error("Jelo više nije dostupno.");
}

export async function incrementDishStockDb(
  dateKey: string,
  mealType: MealType,
  dishId: string,
  quantity = 1,
) {
  const menu = await loadMenuEntry(dateKey, mealType);
  if (!menu) {
    return;
  }

  const db = getDb();
  const [menuRow] = await db
    .select()
    .from(dailyMenus)
    .where(and(eq(dailyMenus.dateKey, dateKey), eq(dailyMenus.mealType, mealType)))
    .limit(1);

  if (!menuRow) {
    return;
  }

  for (const slot of menu.slots) {
    if (!slot.dishIds.includes(dishId)) {
      continue;
    }

    const currentStock = slot.dishStock[dishId] ?? 0;

    const [slotRow] = await db
      .select()
      .from(dailyMenuSlots)
      .where(and(eq(dailyMenuSlots.menuId, menuRow.id), eq(dailyMenuSlots.slotId, slot.slotId)))
      .limit(1);

    if (!slotRow) {
      continue;
    }

    await db
      .update(dailyMenuSlotDishes)
      .set({ stock: currentStock + quantity })
      .where(
        and(
          eq(dailyMenuSlotDishes.slotRowId, slotRow.id),
          eq(dailyMenuSlotDishes.dishId, dishId),
        ),
      );

    return;
  }
}
