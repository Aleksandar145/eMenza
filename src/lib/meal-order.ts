import type { MealType } from "@/lib/meal-types";

export const MEAL_TYPE_ORDER: MealType[] = ["breakfast", "lunch", "dinner"];

export function sortMealTypes(meals: Iterable<MealType>): MealType[] {
  const set = new Set(meals);
  return MEAL_TYPE_ORDER.filter((type) => set.has(type));
}
