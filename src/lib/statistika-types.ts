import type { MealType } from "@/lib/meal-types";

export type SpendingPeriod = "weekly" | "monthly" | "yearly";

export type MealSpendingSlice = {
  breakfast: number;
  lunch: number;
  dinner: number;
};

export type SpendingBarPoint = {
  label: string;
  meals: MealSpendingSlice;
  active?: boolean;
  bucketStart?: string;
  bucketEnd?: string;
};

export type MealBreakdownItem = {
  label: string;
  type: MealType;
  count: number;
  amountRsd: number;
  percent: number;
};

export type TransactionType =
  | "meal_charge"
  | "refund"
  | "top_up_cash"
  | "top_up_bank";

export type TransactionStatus = "success" | "pending" | "error";

export type StatisticsTransaction = {
  id: string;
  createdAt: string;
  type: TransactionType;
  description: string;
  amountRsd: number;
  status: TransactionStatus;
};

export type StatisticsSummary = {
  totalSpentRsd: number;
  reservedMealsCount: number;
  periodSpentRsd: number;
  periodMealsCount: number;
  periodAvgPerMealRsd: number;
  periodChangePercent: number | null;
  prevPeriodSpentRsd: number;
  mealsThisMonth: number;
  monthSpentRsd: number;
  prevMonthSpentRsd: number;
  monthChangePercent: number | null;
};

export type StatisticsPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type StudentStatisticsPayload = {
  summary: StatisticsSummary;
  trend: {
    period: SpendingPeriod;
    title: string;
    points: SpendingBarPoint[];
  };
  breakdown: {
    title: string;
    total: number;
    items: MealBreakdownItem[];
  };
  transactions: StatisticsTransaction[];
  pagination: StatisticsPagination;
  hasData: boolean;
};

export function getMealTotal(meals: MealSpendingSlice) {
  return meals.breakfast + meals.lunch + meals.dinner;
}

export function getMaxSpendingTotal(points: SpendingBarPoint[]) {
  return Math.max(...points.map((point) => getMealTotal(point.meals)), 1);
}

export function formatStatisticsRsd(amount: number, options?: { signed?: boolean }) {
  const absolute = Math.abs(amount);
  const formatted = new Intl.NumberFormat("sr-RS", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(absolute);

  if (!options?.signed) {
    return `${formatted} RSD`;
  }

  if (amount > 0) {
    return `+${formatted} RSD`;
  }
  if (amount < 0) {
    return `-${formatted} RSD`;
  }
  return `${formatted} RSD`;
}
