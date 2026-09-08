import { z } from "zod";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireKitchenModerator } from "@/server/auth/session";
import {
  deleteRecipeDb,
  fetchRecipeState,
  upsertRecipeDb,
} from "@/server/repositories/magacin-recipe";

const entrySchema = z.object({
  ingredientId: z.string().optional(),
  ingredientName: z.string().min(1),
  unit: z.enum(["kg", "g", "l", "kom", "pak"]),
  perServing: z.number().nonnegative(),
  used: z.boolean(),
});

const bodySchema = z.object({
  dishName: z.string().min(1),
  entries: z.array(entrySchema).max(500),
  totalGramsPerPortion: z.number().nonnegative().optional(),
});

export async function GET() {
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  const auth = await requireKitchenModerator();
  if ("error" in auth) return auth.error;

  try {
    const state = await fetchRecipeState();
    return jsonOk(state);
  } catch (error) {
    console.error("[magacin-recipe GET]", error);
    return jsonError("Greška pri učitavanju spiskova jela.", 500);
  }
}

export async function POST(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  const auth = await requireKitchenModerator();
  if ("error" in auth) return auth.error;

  try {
    const body = bodySchema.parse(await request.json());
    const state = await upsertRecipeDb(
      body.dishName,
      body.entries,
      body.totalGramsPerPortion,
    );
    return jsonOk({ state }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed";
    return jsonError(message, 400);
  }
}

export async function DELETE(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  const auth = await requireKitchenModerator();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const dishName = searchParams.get("dishName");
  if (!dishName) {
    return jsonError("Missing dishName", 400);
  }

  try {
    const state = await deleteRecipeDb(dishName);
    return jsonOk(state);
  } catch (error) {
    console.error("[magacin-recipe DELETE]", error);
    return jsonError("Greška pri brisanju spiska.", 500);
  }
}
