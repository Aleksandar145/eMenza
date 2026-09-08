import { parseDateKey } from "@/lib/calendar-utils";
import { getWorkingHours } from "@/lib/admin-system-store";
import type { MealType, WorkingHoursRow } from "@/lib/meal-types";

function isWeekendDateKey(dateKey: string): boolean {
  const date = parseDateKey(dateKey);
  if (!date) return false;
  const dayOfWeek = new Date(date.year, date.month - 1, date.day).getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

export function getMealTypeWindowText(
  dateKey: string,
  mealType: MealType,
  workingHours: WorkingHoursRow[] = getWorkingHours(),
): string | null {
  const row = workingHours.find((entry) => entry.type === mealType);
  if (!row) return null;
  return isWeekendDateKey(dateKey) ? row.weekend : row.weekday;
}

export function isMealTypeInWorkingHours(
  dateKey: string,
  mealType: MealType,
  workingHours: WorkingHoursRow[] = getWorkingHours(),
): boolean {
  const text = getMealTypeWindowText(dateKey, mealType, workingHours);
  return text !== null && text.trim().length > 0;
}

export function getAvailableMealTypes(
  dateKey: string,
  workingHours: WorkingHoursRow[] = getWorkingHours(),
): MealType[] {
  return (["breakfast", "lunch", "dinner"] as MealType[]).filter((mt) =>
    isMealTypeInWorkingHours(dateKey, mt, workingHours),
  );
}
