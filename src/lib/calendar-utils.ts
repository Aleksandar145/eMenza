import type { CalendarDayData, MealType } from "@/lib/dashboard-mock";
import { sortMealTypes } from "@/lib/meal-order";

export type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

const monthNamesShort = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Maj",
  "Jun",
  "Jul",
  "Avg",
  "Sep",
  "Okt",
  "Nov",
  "Dec",
] as const;

const monthNamesLong = [
  "januar",
  "februar",
  "mart",
  "april",
  "maj",
  "jun",
  "jul",
  "avgust",
  "septembar",
  "oktobar",
  "novembar",
  "decembar",
] as const;

export function toDateKey(date: CalendarDate) {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

export function parseDateKey(dateKey: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return { year, month, day };
}

export function compareDateKeys(a: string, b: string) {
  return a.localeCompare(b);
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  const next = new Date(date.year, date.month - 1, date.day + days);
  return {
    year: next.getFullYear(),
    month: next.getMonth() + 1,
    day: next.getDate(),
  };
}

export function addMonths(date: CalendarDate, months: number): CalendarDate {
  const next = new Date(date.year, date.month - 1 + months, 1);
  return {
    year: next.getFullYear(),
    month: next.getMonth() + 1,
    day: 1,
  };
}

export function getWeekdayIndexMondayFirst(date: CalendarDate) {
  const weekday = new Date(date.year, date.month - 1, date.day).getDay();
  return weekday === 0 ? 6 : weekday - 1;
}

export function formatMonthYearLabel(year: number, month: number) {
  return `${monthNamesShort[month - 1]} ${year}`;
}

export function formatCalendarDateLabel(dateKey: string) {
  const date = parseDateKey(dateKey);
  if (!date) {
    return dateKey;
  }

  return `${date.day}. ${monthNamesLong[date.month - 1]} ${date.year}`;
}

export function getWeekdayLabelForDateKey(dateKey: string) {
  const date = parseDateKey(dateKey);
  if (!date) {
    return "";
  }

  const labels = ["Pon", "Uto", "Sre", "Čet", "Pet", "Sub", "Ned"] as const;
  return labels[getWeekdayIndexMondayFirst(date)];
}

export function buildMonthGrid(
  year: number,
  month: number,
  reservationsByDateKey: Record<string, MealType[]>,
): CalendarDayData[] {
  const firstWeekday = getWeekdayIndexMondayFirst({ year, month, day: 1 });
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: CalendarDayData[] = [];

  const prevMonthDate = addMonths({ year, month, day: 1 }, -1);
  const daysInPrevMonth = new Date(prevMonthDate.year, prevMonthDate.month, 0).getDate();

  for (let index = firstWeekday - 1; index >= 0; index -= 1) {
    const day = daysInPrevMonth - index;
    cells.push(
      createCalendarCell(
        { year: prevMonthDate.year, month: prevMonthDate.month, day },
        true,
        reservationsByDateKey,
      ),
    );
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(createCalendarCell({ year, month, day }, false, reservationsByDateKey));
  }

  const nextMonthDate = addMonths({ year, month, day: 1 }, 1);
  let nextDay = 1;

  while (cells.length % 7 !== 0) {
    cells.push(
      createCalendarCell(
        { year: nextMonthDate.year, month: nextMonthDate.month, day: nextDay },
        true,
        reservationsByDateKey,
      ),
    );
    nextDay += 1;
  }

  while (cells.length < 42) {
    cells.push(
      createCalendarCell(
        { year: nextMonthDate.year, month: nextMonthDate.month, day: nextDay },
        true,
        reservationsByDateKey,
      ),
    );
    nextDay += 1;
  }

  return cells;
}

function createCalendarCell(
  date: CalendarDate,
  outsideMonth: boolean,
  reservationsByDateKey: Record<string, MealType[]>,
): CalendarDayData {
  const dateKey = toDateKey(date);
  const weekdayIndex = getWeekdayIndexMondayFirst(date);
  const meals = reservationsByDateKey[dateKey];

  return {
    day: date.day,
    dateKey,
    muted: outsideMonth,
    outsideMonth,
    weekend: weekdayIndex >= 5,
    meals: meals ? sortMealTypes(meals) : undefined,
  };
}
