import type { SpendingPeriod } from "@/lib/statistika-types";
import {
  addDays,
  addMonths,
  compareDateKeys,
  parseDateKey,
  toDateKey,
  type CalendarDate,
} from "@/lib/calendar-utils";

function calendarDateToDate({ year, month, day }: CalendarDate): Date {
  return new Date(year, month - 1, day);
}

function dateToCalendarDate(date: Date): CalendarDate {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

export function getWeekStartDateKey(dateKey: string): string {
  const parsed = parseDateKey(dateKey);
  if (!parsed) {
    return dateKey;
  }

  const date = calendarDateToDate(parsed);
  const dayOfWeek = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - dayOfWeek);
  return toDateKey(dateToCalendarDate(date));
}

export function getPeriodStartDateKey(period: SpendingPeriod, dateKey: string): string {
  const parsed = parseDateKey(dateKey);
  if (!parsed) {
    return dateKey;
  }

  if (period === "weekly") {
    return getWeekStartDateKey(dateKey);
  }

  if (period === "monthly") {
    return toDateKey({ year: parsed.year, month: parsed.month, day: 1 });
  }

  return toDateKey({ year: parsed.year, month: 1, day: 1 });
}

export function shiftAnchorDateKey(
  period: SpendingPeriod,
  anchorDateKey: string,
  delta: number,
): string {
  const parsed = parseDateKey(anchorDateKey);
  if (!parsed) {
    return anchorDateKey;
  }

  if (period === "weekly") {
    return toDateKey(addDays(parsed, delta * 7));
  }

  if (period === "monthly") {
    return toDateKey(addMonths(parsed, delta));
  }

  return toDateKey({ year: parsed.year + delta, month: parsed.month, day: parsed.day });
}

export function canAdvanceAnchor(
  period: SpendingPeriod,
  anchorDateKey: string,
  todayDateKey: string,
): boolean {
  const anchorStart = getPeriodStartDateKey(period, anchorDateKey);
  const todayStart = getPeriodStartDateKey(period, todayDateKey);
  return compareDateKeys(anchorStart, todayStart) < 0;
}

export function clampAnchorDateKey(anchorDateKey: string, todayDateKey: string): string {
  return compareDateKeys(anchorDateKey, todayDateKey) > 0 ? todayDateKey : anchorDateKey;
}
