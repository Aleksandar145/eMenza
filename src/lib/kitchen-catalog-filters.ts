import type { Dish, DishBadge } from "@/lib/dish-catalog-mock";
import type { KitchenMenuSlotId } from "@/lib/kuhinja-mock";

export type CatalogDishFilters = {
  query: string;
  badges: DishBadge[];
};

export type SlotCatalogFilters = Record<KitchenMenuSlotId, CatalogDishFilters>;

export function createEmptySlotFilters(): SlotCatalogFilters {
  return {
    main: { query: "", badges: [] },
    side: { query: "", badges: [] },
    salad: { query: "", badges: [] },
    dessert: { query: "", badges: [] },
  };
}

export function filterCatalogDishes(dishes: Dish[], { query, badges }: CatalogDishFilters): Dish[] {
  const normalizedQuery = query.trim().toLowerCase();

  return dishes.filter((dish) => {
    if (normalizedQuery && !dish.name.toLowerCase().includes(normalizedQuery)) {
      return false;
    }

    if (badges.length > 0 && !badges.some((badge) => dish.badges.includes(badge))) {
      return false;
    }

    return true;
  });
}
