import { apiGetData } from "@/lib/api/client";
import type { MealType } from "@/lib/meal-types";

export type AiRecommendationRpcRow = {
  slot_id: "main" | "side" | "salad" | "dessert";
  dish_id: string;
  dish_name: string;
  rank_position: number;
  price_rsd: number;
  badges: string[] | null;
  stock: number;
  reason: string;
};

type FetchAiRecommendationParams = {
  dateKey: string;
  mealType: MealType;
  posnoRequired?: boolean;
  forceNonPosno?: boolean;
};

export async function fetchAiRecommendationFromApi({
  dateKey,
  mealType,
  posnoRequired = false,
  forceNonPosno = false,
}: FetchAiRecommendationParams) {
  const params = new URLSearchParams({
    dateKey,
    mealType,
    posnoRequired: posnoRequired ? "1" : "0",
    forceNonPosno: forceNonPosno ? "1" : "0",
  });

  const data = await apiGetData<{ rows: AiRecommendationRpcRow[] }>(
    `/api/ai-preporuka/recommendation?${params.toString()}`,
  );

  return data.rows;
}
