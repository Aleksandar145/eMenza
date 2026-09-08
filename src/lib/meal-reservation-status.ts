import type { MealReservationStatus } from "@/lib/dashboard-mock";
import { getAppDateKey, getAppNow } from "@/lib/date-utils";
import { isWithinPickupWindow } from "@/lib/meal-pickup-window";
import type { MealType, WorkingHoursRow } from "@/lib/meal-types";

export function isReservationActiveForPickup(
  dateKey: string,
  mealType: MealType,
  workingHours: WorkingHoursRow[],
  appNow: Date = getAppNow(),
) {
  return (
    dateKey === getAppDateKey(appNow) &&
    isWithinPickupWindow(dateKey, mealType, workingHours, appNow)
  );
}

export function resolveEffectiveReservationStatus(
  dateKey: string,
  mealType: MealType,
  storedStatus: MealReservationStatus,
  workingHours: WorkingHoursRow[],
  appNow: Date = getAppNow(),
): MealReservationStatus {
  if (
    storedStatus === "iskorisceno" ||
    storedStatus === "propusteno" ||
    storedStatus === "nerezervisano"
  ) {
    return storedStatus;
  }

  if (isReservationActiveForPickup(dateKey, mealType, workingHours, appNow)) {
    return "aktivno";
  }

  return "zakazano";
}
