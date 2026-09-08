import { apiDelete, apiGet, apiPost } from "@/lib/api/client";
import { isClientBackendEnabled } from "@/lib/backend-config";
import type {
  DishDemand,
  DishRecipeEntry,
  RecipeState,
} from "@/lib/magacin-recipe-mock";
import type { MealType } from "@/lib/meal-types";

export function shouldUseRecipeApi() {
  return isClientBackendEnabled();
}

export type UpsertDishRecipeInput = {
  dishName: string;
  entries: DishRecipeEntry[];
  totalGramsPerPortion?: number;
};

export type DemandResponse = {
  demand: DishDemand[];
  totalServings: number;
};

export async function fetchRecipesFromApi(): Promise<RecipeState> {
  return apiGet<RecipeState>("/api/magacin-recipe");
}

export async function fetchDemandFromApi(
  dateKey: string,
  mealType: MealType,
): Promise<DemandResponse> {
  const params = new URLSearchParams({ dateKey, mealType });
  return apiGet<DemandResponse>(`/api/magacin-recipe/demand?${params.toString()}`);
}

export async function upsertRecipeViaApi(
  input: UpsertDishRecipeInput,
): Promise<RecipeState> {
  const result = await apiPost<{ state: RecipeState }>("/api/magacin-recipe", {
    dishName: input.dishName,
    entries: input.entries,
    totalGramsPerPortion: input.totalGramsPerPortion,
  });
  return result.state;
}

export async function deleteRecipeViaApi(dishName: string): Promise<RecipeState> {
  return apiDelete<RecipeState>(
    `/api/magacin-recipe?dishName=${encodeURIComponent(dishName)}`,
  );
}

export async function markDateAppliedViaApi(dateKey: string): Promise<RecipeState> {
  const result = await apiPost<{ state: RecipeState }>("/api/magacin-recipe/apply", {
    dateKey,
  });
  return result.state;
}
