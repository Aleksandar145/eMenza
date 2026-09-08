import { z } from "zod";
import type { KitchenMenuSlotId } from "@/lib/kuhinja-mock";
import type { MealType } from "@/lib/meal-types";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireKitchenModerator } from "@/server/auth/session";
import { appendActivityLogDb } from "@/server/repositories/activity-logs";
import {
  copyMenuFromDateDb,
  fetchJelovnikState,
  publishMenuDb,
  publishScheduleMenusDb,
  setSlotDishIdsDb,
  setSlotDishStockDb,
  toggleDailyMenuPublishedDb,
  toggleSlotDishDb,
} from "@/server/repositories/menus";
import { pruneOrphanMenuDishesDb } from "@/server/repositories/dish-dedupe";

export async function GET(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const { searchParams } = new URL(request.url);
  const fromDateKey = searchParams.get("from") ?? undefined;
  const toDateKey = searchParams.get("to") ?? undefined;
  const state = await fetchJelovnikState(
    fromDateKey || toDateKey ? { fromDateKey, toDateKey } : undefined,
  );
  return jsonOk(state);
}

const menuActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("set_slot_dishes"),
    dateKey: z.string(),
    mealType: z.enum(["breakfast", "lunch", "dinner"]),
    slotId: z.enum(["main", "side", "salad", "dessert"]),
    dishIds: z.array(z.string().uuid()),
    previousStock: z.record(z.string(), z.number()).optional(),
  }),
  z.object({
    action: z.literal("toggle_slot_dish"),
    dateKey: z.string(),
    mealType: z.enum(["breakfast", "lunch", "dinner"]),
    slotId: z.enum(["main", "side", "salad", "dessert"]),
    dishId: z.string().uuid(),
    selected: z.boolean(),
  }),
  z.object({
    action: z.literal("set_dish_stock"),
    dateKey: z.string(),
    mealType: z.enum(["breakfast", "lunch", "dinner"]),
    slotId: z.enum(["main", "side", "salad", "dessert"]),
    dishId: z.string().uuid(),
    stock: z.number().int().nonnegative(),
  }),
  z.object({
    action: z.literal("toggle_published"),
    dateKey: z.string(),
    mealType: z.enum(["breakfast", "lunch", "dinner"]),
    published: z.boolean(),
  }),
  z.object({
    action: z.literal("copy_from"),
    sourceDateKey: z.string(),
    targetDateKey: z.string(),
    mealType: z.enum(["breakfast", "lunch", "dinner"]),
  }),
  z.object({
    action: z.literal("publish_menu"),
    dateKey: z.string(),
    mealType: z.enum(["breakfast", "lunch", "dinner"]),
    published: z.boolean(),
    slots: z.record(
      z.enum(["main", "side", "salad", "dessert"]),
      z.object({
        dishIds: z.array(z.string().uuid()),
        dishStock: z.record(z.string(), z.number()),
      }),
    ),
  }),
  z.object({
    action: z.literal("publish_schedule"),
    meals: z.array(
      z.object({
        dateKey: z.string(),
        mealType: z.enum(["breakfast", "lunch", "dinner"]),
        slots: z.record(
          z.enum(["main", "side", "salad", "dessert"]),
          z.object({
            dishIds: z.array(z.string().uuid()),
            dishStock: z.record(z.string(), z.number()),
          }),
        ),
      }),
    ),
  }),
]);

export async function POST(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const auth = await requireKitchenModerator();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const body = menuActionSchema.parse(await request.json());

    const actorId = "user" in auth && auth.user ? auth.user.id : undefined;
    const ip = request.headers.get("x-forwarded-for");

    switch (body.action) {
      case "set_slot_dishes":
        await setSlotDishIdsDb(
          body.dateKey,
          body.mealType as MealType,
          body.slotId as KitchenMenuSlotId,
          body.dishIds,
          body.previousStock,
        );
        await appendActivityLogDb({
          userId: actorId,
          actionType: "menu.slot.update",
          description: `Postavljena jela u terminu ${body.dateKey} ${body.mealType} ${body.slotId}`,
          ipAddress: ip,
        });
        break;
      case "toggle_slot_dish":
        await toggleSlotDishDb(
          body.dateKey,
          body.mealType as MealType,
          body.slotId as KitchenMenuSlotId,
          body.dishId,
          body.selected,
        );
        await appendActivityLogDb({
          userId: actorId,
          actionType: "menu.slot.toggle",
          description: `${body.selected ? "Dodato" : "Uklonjeno"} jelo ${body.dishId} u terminu ${body.dateKey} ${body.mealType} ${body.slotId}`,
          ipAddress: ip,
        });
        break;
      case "set_dish_stock":
        await setSlotDishStockDb(
          body.dateKey,
          body.mealType as MealType,
          body.slotId as KitchenMenuSlotId,
          body.dishId,
          body.stock,
        );
        await appendActivityLogDb({
          userId: actorId,
          actionType: "menu.stock",
          description: `Promenjen stock jela ${body.dishId} na ${body.stock} (${body.dateKey} ${body.mealType} ${body.slotId})`,
          ipAddress: ip,
        });
        break;
      case "toggle_published":
        await toggleDailyMenuPublishedDb(
          body.dateKey,
          body.mealType as MealType,
          body.published,
        );
        await appendActivityLogDb({
          userId: actorId,
          actionType: "menu.publish.toggle",
          description: `${body.published ? "Objavljen" : "Sakriven"} meni za ${body.dateKey} ${body.mealType}`,
          ipAddress: ip,
        });
        break;
      case "copy_from":
        await copyMenuFromDateDb(
          body.sourceDateKey,
          body.targetDateKey,
          body.mealType as MealType,
        );
        await appendActivityLogDb({
          userId: actorId,
          actionType: "menu.copy",
          description: `Kopiran meni sa ${body.sourceDateKey} na ${body.targetDateKey} (${body.mealType})`,
          ipAddress: ip,
        });
        break;
      case "publish_menu": {
        const slots = (["main", "side", "salad", "dessert"] as const).map((slotId) => ({
          slotId,
          dishIds: body.slots[slotId]?.dishIds ?? [],
          dishStock: body.slots[slotId]?.dishStock ?? {},
        }));
        const menu = await publishMenuDb(
          body.dateKey,
          body.mealType as MealType,
          slots,
          body.published,
        );
        await appendActivityLogDb({
          userId: actorId,
          actionType: "menu.publish.toggle",
          description: `Objavljen meni za ${body.dateKey} ${body.mealType}`,
          ipAddress: ip,
        });
        return jsonOk({ menu });
      }
      case "publish_schedule": {
        const meals = body.meals.map((meal) => ({
          dateKey: meal.dateKey,
          mealType: meal.mealType as MealType,
          slots: (["main", "side", "salad", "dessert"] as const).map((slotId) => ({
            slotId,
            dishIds: meal.slots[slotId]?.dishIds ?? [],
            dishStock: meal.slots[slotId]?.dishStock ?? {},
          })),
        }));
        const publishedMenus = await publishScheduleMenusDb(meals);
        await appendActivityLogDb({
          userId: actorId,
          actionType: "menu.schedule.publish",
          description: `Objavljen raspored za ${body.meals.length} termina`,
          ipAddress: ip,
        });
        return jsonOk({ publishedMenus });
      }
    }

    const state = await pruneOrphanMenuDishesDb().then(() => fetchJelovnikState());
    return jsonOk(state);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Menu update failed", 400);
  }
}
