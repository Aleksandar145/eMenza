import { parseDateKey, toDateKey } from "@/lib/calendar-utils";

import { getBookingCutoffHours, getCancellationCutoffHours, getWorkingHours } from "@/lib/admin-system-store";

import { getAppDateKey, getAppNow } from "@/lib/date-utils";

import {

  isDayAvailableForReservation,

  type MealDetailsSection,

  type MealReservationStatus,

} from "@/lib/dashboard-mock";

import { resolvePickupWindowText } from "@/lib/meal-pickup-window";

import type { MealType, WorkingHoursRow } from "@/lib/meal-types";



const mealOrder: MealType[] = ["breakfast", "lunch", "dinner"];

function resolveLeadMs(cutoffHours: number = 24): number {
  return Math.max(1, cutoffHours) * 60 * 60 * 1000;
}



function parseServiceStartMinutes(windowText: string): number | null {

  const match = windowText.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);

  if (!match) {

    return null;

  }



  const [hours, minutes] = match[1].split(":").map(Number);

  return hours * 60 + minutes;

}



export function getRealTodayDateKey(now: Date = new Date()): string {

  return toDateKey({

    year: now.getFullYear(),

    month: now.getMonth() + 1,

    day: now.getDate(),

  });

}



export function getBookingTodayDateKey(): string {

  return getAppDateKey();

}



export function getBookingNow(realNow: Date = new Date()): Date {

  return getAppNow(realNow);

}



export function getMealServiceStartAt(

  dateKey: string,

  mealType: MealType,

  workingHours: WorkingHoursRow[] = getWorkingHours(),

): Date | null {

  const date = parseDateKey(dateKey);

  if (!date) {

    return null;

  }



  const windowText = resolvePickupWindowText(dateKey, mealType, workingHours);

  const startMinutes = parseServiceStartMinutes(windowText);

  if (startMinutes === null) {

    return null;

  }



  const hour = Math.floor(startMinutes / 60);

  const minute = startMinutes % 60;

  return new Date(date.year, date.month - 1, date.day, hour, minute, 0, 0);

}



export function getReservationDeadlineAt(

  dateKey: string,

  mealType: MealType,

  workingHours?: WorkingHoursRow[],

  cutoffHours?: number,

): Date | null {

  const serviceStart = getMealServiceStartAt(dateKey, mealType, workingHours);

  if (!serviceStart) {

    return null;

  }

  return new Date(serviceStart.getTime() - resolveLeadMs(cutoffHours));

}



export function isMealReservationWindowPassed(

  dateKey: string,

  mealType: MealType,

  now: Date = getBookingNow(),

  workingHours?: WorkingHoursRow[],

  cutoffHours?: number,

): boolean {

  const deadline = getReservationDeadlineAt(dateKey, mealType, workingHours, cutoffHours);

  if (!deadline) {

    return false;

  }



  return now.getTime() >= deadline.getTime();

}



export function canCancelMealSlot(

  dateKey: string,

  mealType: MealType,

  now: Date = getBookingNow(),

  workingHours?: WorkingHoursRow[],

  cutoffHours?: number,

): boolean {

  return !isMealReservationWindowPassed(dateKey, mealType, now, workingHours, cutoffHours ?? getCancellationCutoffHours());

}



import { getMealTypeWindowText } from "@/lib/schedule-utils";

export function canBookMealSlot(

  dateKey: string,

  mealType: MealType,

  status: MealReservationStatus,

  now: Date = getBookingNow(),

  workingHours?: WorkingHoursRow[],

  cutoffHours?: number,

): boolean {

  if (status !== "nerezervisano") {

    return false;

  }



  if (!isDayAvailableForReservation(dateKey, getAppDateKey(now))) {

    return false;

  }



  const resolvedWorkingHours = workingHours ?? getWorkingHours();

  const windowText = getMealTypeWindowText(dateKey, mealType, resolvedWorkingHours);

  if (!windowText || !windowText.trim()) {

    return false;

  }



  return !isMealReservationWindowPassed(dateKey, mealType, now, resolvedWorkingHours, cutoffHours ?? getBookingCutoffHours());

}



export function shouldShowBookingPassedMessage(

  dateKey: string,

  mealType: MealType,

  status: MealReservationStatus,

  now: Date = getBookingNow(),

  workingHours?: WorkingHoursRow[],

  cutoffHours?: number,

): boolean {

  if (status !== "nerezervisano") {

    return false;

  }



  return isMealReservationWindowPassed(dateKey, mealType, now, workingHours, cutoffHours ?? getBookingCutoffHours());

}



export function canShowAiPreporuka(
  dateKey: string,
  mealType: MealType,
  now: Date = getBookingNow(),
  workingHours?: WorkingHoursRow[],
  cutoffHours?: number,
): boolean {
  if (!isDayAvailableForReservation(dateKey, getAppDateKey(now))) {
    return false;
  }

  return !isMealReservationWindowPassed(dateKey, mealType, now, workingHours, cutoffHours ?? getBookingCutoffHours());
}



export function getFirstBookableMealType(

  dateKey: string,

  sections: MealDetailsSection[],

  now: Date = getBookingNow(),

  workingHours?: WorkingHoursRow[],

  cutoffHours?: number,

): MealType | null {

  for (const mealType of mealOrder) {

    const section = sections.find((entry) => entry.type === mealType);

    if (!section) {

      continue;

    }

    if (canBookMealSlot(dateKey, mealType, section.status, now, workingHours, cutoffHours ?? getBookingCutoffHours())) {

      return mealType;

    }

  }

  return null;

}



export type NoBookableMealsReason = "outside_window" | "all_booked" | "window_passed";



export function hasBookableMealSlotOnDay(

  dateKey: string,

  reservedMealTypes: MealType[] = [],

  now: Date = getBookingNow(),

  workingHours?: WorkingHoursRow[],

  todayDateKey: string = getAppDateKey(now),

  cutoffHours?: number,

): boolean {

  if (!isDayAvailableForReservation(dateKey, todayDateKey)) {

    return false;

  }

  for (const mealType of mealOrder) {

    if (reservedMealTypes.includes(mealType)) {

      continue;

    }

    if (!isMealReservationWindowPassed(dateKey, mealType, now, workingHours, cutoffHours)) {

      return true;

    }

  }

  return false;

}



export function getNoBookableMealsReason(

  dateKey: string,

  sections: MealDetailsSection[],

  now: Date = getBookingNow(),

  workingHours?: WorkingHoursRow[],

  todayDateKey: string = getAppDateKey(now),

  cutoffHours?: number,

): NoBookableMealsReason | null {

  if (!isDayAvailableForReservation(dateKey, todayDateKey)) {

    return "outside_window";

  }

  const hasBookable = sections.some((section) =>

    canBookMealSlot(dateKey, section.type, section.status, now, workingHours, cutoffHours ?? getBookingCutoffHours()),

  );

  if (hasBookable) {

    return null;

  }

  const hasUnreserved = sections.some((section) => section.status === "nerezervisano");

  if (!hasUnreserved) {

    return "all_booked";

  }

  return "window_passed";

}



export const mealBookingWindowPassedMessage = "Termin za rezervaciju je prošao.";

export function getCancellationWindowMessage(cutoffHours?: number): string {

  const h = cutoffHours ?? getCancellationCutoffHours() ?? 24;

  if (h >= 24 && h % 24 === 0) {

    const days = h / 24;

    if (days === 1) return "Termin za otkazivanje je prošao (najkasnije 24h pre serviranja).";

    return `Termin za otkazivanje je prošao (najkasnije ${days} dana pre serviranja).`;

  }

  return `Termin za otkazivanje je prošao (najkasnije ${h}h pre serviranja).`;

}



function pluralSr(count: number, forms: [string, string, string]) {

  const mod10 = count % 10;

  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {

    return forms[0];

  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {

    return forms[1];

  }

  return forms[2];

}



export function getReservationTimeRemainingMs(

  dateKey: string,

  mealType: MealType,

  now: Date = getBookingNow(),

  workingHours?: WorkingHoursRow[],

  cutoffHours?: number,

): number | null {

  const deadline = getReservationDeadlineAt(dateKey, mealType, workingHours, cutoffHours);

  if (!deadline) {

    return null;

  }

  return Math.max(0, deadline.getTime() - now.getTime());

}



export function formatReservationTimeRemaining(

  dateKey: string,

  mealType: MealType,

  now: Date = getBookingNow(),

  workingHours?: WorkingHoursRow[],

  cutoffHours?: number,

): string | null {

  const remainingMs = getReservationTimeRemainingMs(dateKey, mealType, now, workingHours, cutoffHours);

  if (remainingMs === null || remainingMs <= 0) {

    return null;

  }

  const totalMinutes = Math.floor(remainingMs / 60_000);

  const days = Math.floor(totalMinutes / (60 * 24));

  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);

  const minutes = totalMinutes % 60;

  if (days > 0) {

    const dayLabel = pluralSr(days, ["dan", "dana", "dana"]);

    if (hours > 0) {

      const hourLabel = pluralSr(hours, ["sat", "sata", "sati"]);

      return `još ${days} ${dayLabel} i ${hours} ${hourLabel}`;

    }

    return `još ${days} ${dayLabel}`;

  }

  if (hours > 0) {

    if (minutes > 0) {

      return `još ${hours} ${pluralSr(hours, ["sat", "sata", "sati"])} i ${minutes} min`;

    }

    return `još ${hours} ${pluralSr(hours, ["sat", "sata", "sati"])}`;

  }

  if (minutes > 0) {

    return `još ${minutes} min`;

  }

  return "još manje od 1 min";

}



export function formatReservationBookByLabel(

  dateKey: string,

  mealType: MealType,

  status: MealReservationStatus,

  now: Date = getBookingNow(),

  workingHours?: WorkingHoursRow[],

  cutoffHours?: number,

): string | null {

  if (!canBookMealSlot(dateKey, mealType, status, now, workingHours, cutoffHours ?? getBookingCutoffHours())) {

    return null;

  }

  const remaining = formatReservationTimeRemaining(dateKey, mealType, now, workingHours, cutoffHours);

  if (!remaining) {

    return null;

  }

  return `Za rezervaciju ${remaining}`;

}
