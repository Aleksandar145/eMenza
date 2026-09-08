import { parseDateKey } from "@/lib/calendar-utils";
import { getAppDateKey, getAppNow } from "@/lib/date-utils";
import type { MealType, WorkingHoursRow } from "@/lib/meal-types";

const mealOrder: MealType[] = ["breakfast", "lunch", "dinner"];
function isWeekendDateKey(dateKey: string) {
  const date = parseDateKey(dateKey);
  if (!date) {
    return false;
  }

  const dayOfWeek = new Date(date.year, date.month - 1, date.day).getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

export function resolvePickupWindowText(
  dateKey: string,
  mealType: MealType,
  workingHours: WorkingHoursRow[],
) {
  const row = workingHours.find((entry) => entry.type === mealType);
  if (!row) {
    return "";
  }

  return isWeekendDateKey(dateKey) ? row.weekend : row.weekday;
}

function parseTimeToMinutes(value: string) {
  const [hours, minutes] = value.trim().split(":").map(Number);
  return hours * 60 + minutes;
}

export function getPickupWindowEndMinutes(
  dateKey: string,
  mealType: MealType,
  workingHours: WorkingHoursRow[],
): number | null {
  const windowText = resolvePickupWindowText(dateKey, mealType, workingHours);
  const match = windowText.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
  if (!match) {
    return null;
  }

  return parseTimeToMinutes(match[2]);
}

export function isPickupWindowEnded(
  dateKey: string,
  mealType: MealType,
  workingHours: WorkingHoursRow[],
  now: Date = getAppNow(),
): boolean {
  const endMinutes = getPickupWindowEndMinutes(dateKey, mealType, workingHours);
  if (endMinutes === null) {
    return false;
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= endMinutes;
}

/** Meal currently in pickup window, or the next one whose window has not ended. */
export function getTodayFocusMealType(
  dateKey: string,
  workingHours: WorkingHoursRow[],
  now: Date = getAppNow(),
): MealType {
  if (dateKey !== getAppDateKey(now)) {
    return "lunch";
  }

  for (const mealType of mealOrder) {
    if (isWithinPickupWindow(dateKey, mealType, workingHours, now)) {
      return mealType;
    }
  }

  for (const mealType of mealOrder) {
    if (!isPickupWindowEnded(dateKey, mealType, workingHours, now)) {
      return mealType;
    }
  }

  return "dinner";
}

export function isWithinPickupWindow(
  dateKey: string,
  mealType: MealType,
  workingHours: WorkingHoursRow[],
  now: Date = getAppNow(),
) {
  const windowText = resolvePickupWindowText(dateKey, mealType, workingHours);
  const match = windowText.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
  if (!match) {
    return false;
  }

  const startMinutes = parseTimeToMinutes(match[1]);
  const endMinutes = parseTimeToMinutes(match[2]);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= startMinutes && nowMinutes < endMinutes;
}
