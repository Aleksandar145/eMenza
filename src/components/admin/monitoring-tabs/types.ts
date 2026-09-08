export type Granularity = "dan" | "nedelja" | "mesec" | "godina";

export type MealCounts = {
  breakfast: number;
  lunch: number;
  dinner: number;
  total: number;
};

export type DiffValue = {
  diff: number;
  percent: number;
};

export type DishCategorySpending = {
  main: number;
  side: number;
  salad: number;
  dessert: number;
  total: number;
};

export type DailyPoint = {
  date: string;
  breakfast: number;
  lunch: number;
  dinner: number;
  total: number;
};

export type DailyDishPoint = {
  date: string;
  main: number;
  side: number;
  salad: number;
  dessert: number;
  total: number;
};

export type ReservationDailyPoint = {
  date: string;
  total: number;
  pickedUp: number;
  missed: number;
  cancelled: number;
  other: number;
};

export type ReservationSummary = {
  total: number;
  pickedUp: number;
  missed: number;
  cancelled: number;
  other: number;
  utilization: number;
};

export type MonitoringResponse = {
  period1: MealCounts;
  period2: MealCounts | null;
  difference: Record<string, DiffValue> | null;
  dishSpending: Record<string, DishCategorySpending>;
  dailyTrend: DailyPoint[];
  dailyDishTrend: DailyDishPoint[];
  reservationTrend: ReservationDailyPoint[];
  reservationSummary: ReservationSummary;
  reservationPeriod2: ReservationSummary | null;
  reservationDifference: Record<string, DiffValue> | null;
};
