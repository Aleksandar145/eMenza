import type { DailyMenuEntry, KuhinjaJelovnikState } from "@/lib/kuhinja-mock";
import type { Dish } from "@/lib/dish-catalog-mock";
import type { MealType } from "@/lib/meal-types";
import { apiFetch } from "@/lib/api/client";
import { isClientBackendEnabled } from "@/lib/backend-config";

const MENU_API_TIMEOUT_MS =
  typeof process !== "undefined" && process.env.NODE_ENV === "development" ? 90_000 : 35_000;

export type MenuActionResponse =
  | KuhinjaJelovnikState
  | { menu: DailyMenuEntry }
  | { publishedMenus: DailyMenuEntry[] };

export type PublishedMenuResponse = {
  menu: DailyMenuEntry | null;
  dishes: Dish[];
};

export type JelovnikFetchRange = {
  fromDateKey?: string;
  toDateKey?: string;
};

export async function fetchMenusFromApi(
  range?: JelovnikFetchRange,
): Promise<KuhinjaJelovnikState> {
  const params = new URLSearchParams();
  if (range?.fromDateKey) {
    params.set("from", range.fromDateKey);
  }
  if (range?.toDateKey) {
    params.set("to", range.toDateKey);
  }

  const query = params.toString();
  return apiFetch<KuhinjaJelovnikState>(
    query ? `/api/menus?${query}` : "/api/menus",
    undefined,
    MENU_API_TIMEOUT_MS,
  );
}

export async function fetchPublishedMenuFromApi(
  dateKey: string,
  mealType: MealType,
): Promise<PublishedMenuResponse> {
  const params = new URLSearchParams({ dateKey, mealType });
  return apiFetch<PublishedMenuResponse>(
    `/api/menus/published?${params.toString()}`,
    undefined,
    MENU_API_TIMEOUT_MS,
  );
}

export async function postMenuAction(body: Record<string, unknown>): Promise<MenuActionResponse> {
  return apiFetch<MenuActionResponse>(
    "/api/menus",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    MENU_API_TIMEOUT_MS,
  );
}

export function shouldUseMenusApi() {
  return isClientBackendEnabled();
}
