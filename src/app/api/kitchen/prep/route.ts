import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonOk, requireKitchenStaff } from "@/server/auth/session";
import { getKitchenPrepDb } from "@/server/repositories/kitchen-prep";
import type { MealType } from "@/lib/meal-types";

const MEAL_VALUES: readonly MealType[] = ["breakfast", "lunch", "dinner"];

export async function GET(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  const auth = await requireKitchenStaff();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const dateKey = searchParams.get("date") ?? new Date().toISOString().split("T")[0];
  const rawMeal = searchParams.get("meal") ?? "lunch";
  const mealType: MealType = MEAL_VALUES.includes(rawMeal as MealType) ? (rawMeal as MealType) : "lunch";

  try {
    const stats = await getKitchenPrepDb(dateKey, mealType);
    return jsonOk(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load prep data";
    return jsonOk({ error: message }, 500);
  }
}
