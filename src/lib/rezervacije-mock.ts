import type { MealType } from "@/lib/dashboard-mock";

export type RezervacijeSearchParams = {
  dateKey?: string;
  obrok?: MealType;
};

const validMealTypes = new Set<MealType>(["breakfast", "lunch", "dinner"]);

export function getRezervacijeHref(params?: RezervacijeSearchParams) {
  const searchParams = new URLSearchParams();

  if (params?.dateKey) {
    searchParams.set("datum", params.dateKey);
  }

  if (params?.obrok) {
    searchParams.set("obrok", params.obrok);
  }

  const query = searchParams.toString();
  return query ? `/rezervacije?${query}` : "/rezervacije";
}

export function parseRezervacijeSearchParams(
  searchParams: URLSearchParams,
): RezervacijeSearchParams {
  const datum = searchParams.get("datum") ?? undefined;
  const obrokParam = searchParams.get("obrok");
  const obrok =
    obrokParam && validMealTypes.has(obrokParam as MealType)
      ? (obrokParam as MealType)
      : undefined;

  return {
    dateKey: datum,
    obrok,
  };
}

export type RecentOrderStatus = "success" | "cancelled" | "pending";

export type RecentOrder = {
  id: string;
  dateLabel: string;
  mealLabel: string;
  mealType: MealType;
  summary: string;
  status: RecentOrderStatus;
};

/** @deprecated Koristi buildRecentOrdersFromMock / buildRecentOrdersFromReservations */
export const recentOrders: RecentOrder[] = [
  {
    id: "mock-2026-03-07-all",
    dateLabel: "7. mart",
    mealLabel: "Svi obroci",
    mealType: "lunch",
    summary: "Doručak, ručak i večera",
    status: "success",
  },
  {
    id: "mock-2026-03-06-lunch",
    dateLabel: "6. mart",
    mealLabel: "Ručak",
    mealType: "lunch",
    summary: "Ćevapčići, lepinja, ajvar",
    status: "success",
  },
  {
    id: "mock-2026-03-05-lunch",
    dateLabel: "5. mart",
    mealLabel: "Ručak",
    mealType: "lunch",
    summary: "Pileći file — preuzeto na šalteru",
    status: "success",
  },
];

/** @deprecated Koristi recentOrders */
export const recentOrderHistory = {
  status: "success" as const,
  message:
    "Uspešno ste uplatili doručak, ručak i večeru za 7. mart 2026.",
};
