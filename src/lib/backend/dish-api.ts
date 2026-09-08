import type { Dish, DishCatalogState } from "@/lib/dish-catalog-mock";
import { apiDelete, apiPost } from "@/lib/api/client";
import { isClientBackendEnabled } from "@/lib/backend-config";

export function shouldUseDishApi() {
  return isClientBackendEnabled();
}

export async function createDishViaApi(
  input: Omit<Dish, "id" | "createdAt" | "updatedAt" | "portionWeightGrams">,
): Promise<DishCatalogState> {
  // Strip any mock id — let the server generate a UUID
  const result = await apiPost<{ state: DishCatalogState }>("/api/dishes", {
    name: input.name,
    category: input.category,
    priceRsd: input.priceRsd,
    imageUrl: input.imageUrl,
    badges: input.badges,
    status: input.status,
    proposedBy: input.proposedBy,
  });
  return result.state;
}

export async function updateDishViaApi(
  dish: Omit<Dish, "createdAt" | "updatedAt">,
): Promise<DishCatalogState> {
  const { portionWeightGrams, ...body } = dish;
  const result = await apiPost<{ state: DishCatalogState }>("/api/dishes", body);
  return result.state;
}

export async function archiveDishViaApi(id: string): Promise<DishCatalogState> {
  const result = await apiPost<{ state: DishCatalogState }>("/api/dishes", {
    id,
    status: "archived",
  });
  return result.state;
}

export async function deleteDishViaApi(id: string): Promise<DishCatalogState> {
  return apiDelete<DishCatalogState>(`/api/dishes?id=${encodeURIComponent(id)}`);
}
