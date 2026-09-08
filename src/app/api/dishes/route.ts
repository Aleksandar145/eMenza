import { z } from "zod";
import type { Dish } from "@/lib/dish-catalog-mock";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireKitchenModerator, requireRole } from "@/server/auth/session";
import { deleteDishDb, fetchDishCatalogState, upsertDishDb } from "@/server/repositories/dishes";
import { appendActivityLogDb } from "@/server/repositories/activity-logs";

export async function GET() {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  try {
    const state = await fetchDishCatalogState();
    return jsonOk(state);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Jela nisu dostupna.", 500);
  }
}

const dishSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  category: z.enum(["main", "side", "salad", "dessert"]),
  priceRsd: z.number().int().nonnegative(),
  imageUrl: z.string(),
  badges: z.array(z.string()),
  status: z.enum(["active", "pending_approval", "archived"]),
  proposedBy: z.enum(["kitchen", "admin"]).optional(),
});

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
    const body = dishSchema.parse(await request.json());
    const dish = await upsertDishDb(body as Omit<Dish, "createdAt" | "updatedAt">);
    const isUpdate = Boolean(body.id);
    await appendActivityLogDb({
      userId: "user" in auth && auth.user ? auth.user.id : undefined,
      actionType: "dish.upsert",
      description: `${isUpdate ? "Izmenjeno" : "Dodato"} jelo: ${body.name} (${body.category}, ${body.priceRsd} RSD)`,
      ipAddress: request.headers.get("x-forwarded-for"),
    });
    const state = await fetchDishCatalogState();
    return jsonOk({ dish, state }, 201);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Save failed", 400);
  }
}

export async function DELETE(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const auth = await requireRole(["admin"]);
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return jsonError("Missing id", 400);
    }

    await deleteDishDb(id);
    await appendActivityLogDb({
      userId: auth.user?.id,
      actionType: "dish.delete",
      description: `Obrisano jelo: ${id}`,
      ipAddress: request.headers.get("x-forwarded-for"),
    });
    const state = await fetchDishCatalogState();
    return jsonOk(state);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Brisanje nije uspelo.", 400);
  }
}
