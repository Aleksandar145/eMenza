import { z } from "zod";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireKitchenModerator } from "@/server/auth/session";
import { getDemandForDate } from "@/server/repositories/magacin-recipe";
import type { MealType } from "@/lib/meal-types";

const querySchema = z.object({
  dateKey: z.string().min(1),
  mealType: z.enum(["breakfast", "lunch", "dinner"]),
});

export async function GET(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  const auth = await requireKitchenModerator();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.parse({
    dateKey: searchParams.get("dateKey"),
    mealType: searchParams.get("mealType"),
  });

  try {
    const result = await getDemandForDate(parsed.dateKey, parsed.mealType as MealType);
    return jsonOk(result);
  } catch (error) {
    console.error("[magacin-recipe demand GET]", error);
    return jsonError("Greška pri obračunu porudžbina.", 500);
  }
}
