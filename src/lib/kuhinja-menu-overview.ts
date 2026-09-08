import { getReservationAdvanceDays } from "@/lib/admin-system-store";
import { addDays, parseDateKey, toDateKey } from "@/lib/calendar-utils";
import { formatCalendarDayLabel } from "@/lib/dashboard-mock";
import { getDishesByIds } from "@/lib/dish-catalog-store";
import {
  getDailyMenu,
  getSyncedDailyMenu,
  hasUnsavedMenuChanges,
} from "@/lib/kuhinja-jelovnik-store";
import type { DailyMenuEntry, KitchenMenuSlotId } from "@/lib/kuhinja-mock";
import { kitchenSlotLabels, kitchenSlotOrder } from "@/lib/kuhinja-mock";
import type { MealType } from "@/lib/meal-types";
import { getBookingTodayDateKey } from "@/lib/meal-booking-window";

export type MenuMealStatus =
  | "missing"
  | "draft"
  | "draft_unsaved"
  | "published"
  | "published_empty";

export type MenuSlotSummary = {
  slotId: KitchenMenuSlotId;
  label: string;
  dishNames: string[];
  dishCount: number;
};

export type MenuMealOverview = {
  mealType: MealType;
  status: MenuMealStatus;
  dishCount: number;
  slots: MenuSlotSummary[];
  isInReservationWindow: boolean;
};

export type DayMenuOverview = {
  dateKey: string;
  meals: Record<MealType, MenuMealOverview>;
};

export type MenuAlert = {
  id: string;
  dateKey: string;
  mealType: MealType;
  dateLabel: string;
  mealLabel: string;
  message: string;
  status: MenuMealStatus;
};

export const mealTypeLabels: Record<MealType, string> = {
  breakfast: "Doručak",
  lunch: "Ručak",
  dinner: "Večera",
};

export const mealTypeShortLabels: Record<MealType, string> = {
  breakfast: "D",
  lunch: "R",
  dinner: "V",
};

const mealTypes: MealType[] = ["breakfast", "lunch", "dinner"];

function countDishesInMenu(menu: DailyMenuEntry | null) {
  if (!menu) {
    return 0;
  }

  return menu.slots.reduce((total, slot) => total + slot.dishIds.length, 0);
}

function buildSlotSummaries(menu: DailyMenuEntry | null): MenuSlotSummary[] {
  if (!menu) {
    return kitchenSlotOrder.map((slotId) => ({
      slotId,
      label: kitchenSlotLabels[slotId],
      dishNames: [],
      dishCount: 0,
    }));
  }

  return menu.slots.map((slot) => {
    const dishes = getDishesByIds(slot.dishIds);
    return {
      slotId: slot.slotId,
      label: kitchenSlotLabels[slot.slotId],
      dishNames: dishes.map((dish) => dish.name),
      dishCount: slot.dishIds.length,
    };
  });
}

function isPublishedWithDishes(menu: DailyMenuEntry | null) {
  return Boolean(menu?.published && countDishesInMenu(menu) > 0);
}

export function getMenuMealStatus(dateKey: string, mealType: MealType): MenuMealStatus {
  const draft = getDailyMenu(dateKey, mealType);
  const synced = getSyncedDailyMenu(dateKey, mealType);
  const draftCount = countDishesInMenu(draft);
  const syncedCount = countDishesInMenu(synced);

  if (hasUnsavedMenuChanges(dateKey, mealType) && draftCount > 0) {
    return "draft_unsaved";
  }

  if (isPublishedWithDishes(synced)) {
    return "published";
  }

  if (synced?.published && syncedCount === 0) {
    return "published_empty";
  }

  if (draftCount > 0) {
    return "draft";
  }

  return "missing";
}

export function isDateInReservationWindow(dateKey: string) {
  const days = getMenuOverviewDaysInWindow();
  return days.includes(dateKey);
}

export function getMenuOverviewDaysInWindow() {
  const window = getReservationAdvanceDays();
  const days: string[] = [];
  const anchor = parseDateKey(getBookingTodayDateKey());
  if (!anchor) {
    return days;
  }

  for (let offset = 0; offset < window; offset += 1) {
    days.push(toDateKey(addDays(anchor, offset)));
  }

  return days;
}

function pickDisplayMenu(dateKey: string, mealType: MealType): DailyMenuEntry | null {
  const synced = getSyncedDailyMenu(dateKey, mealType);
  const draft = getDailyMenu(dateKey, mealType);

  if (isPublishedWithDishes(synced)) {
    return synced;
  }

  if (countDishesInMenu(draft) > 0) {
    return draft;
  }

  if (synced && synced.published) {
    return synced;
  }

  return draft ?? synced;
}

export function getMenuMealOverview(dateKey: string, mealType: MealType): MenuMealOverview {
  const displayMenu = pickDisplayMenu(dateKey, mealType);

  return {
    mealType,
    status: getMenuMealStatus(dateKey, mealType),
    dishCount: countDishesInMenu(displayMenu),
    slots: buildSlotSummaries(displayMenu),
    isInReservationWindow: isDateInReservationWindow(dateKey),
  };
}

export function getDayMenuOverview(dateKey: string): DayMenuOverview {
  return {
    dateKey,
    meals: {
      breakfast: getMenuMealOverview(dateKey, "breakfast"),
      lunch: getMenuMealOverview(dateKey, "lunch"),
      dinner: getMenuMealOverview(dateKey, "dinner"),
    },
  };
}

function joinSerList(items: string[]) {
  if (items.length <= 1) {
    return items[0] ?? "";
  }

  if (items.length === 2) {
    return `${items[0]} i ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")} i ${items[items.length - 1]}`;
}

export function formatUncreatedMealsNotice(dateKey: string): string | null {
  const overview = getDayMenuOverview(dateKey);
  const missing = mealTypes
    .filter((mealType) => overview.meals[mealType].status === "missing")
    .map((mealType) => mealTypeLabels[mealType].toLowerCase());

  if (missing.length === 0) {
    return null;
  }

  const list = joinSerList(missing);
  const verb = missing.length === 1 ? "nije kreiran" : "nisu kreirani";
  return `${list} ${verb}`;
}

function alertMessageForStatus(status: MenuMealStatus) {
  switch (status) {
    case "draft_unsaved":
      return "Imate nesačuvane izmene — objavite jelovnik";
    case "draft":
      return "Meni nije objavljen";
    case "published_empty":
      return "Objavljen meni je prazan";
    case "missing":
    default:
      return "Meni nije kreiran";
  }
}

export function getMissingMenuAlerts(): MenuAlert[] {
  const alerts: MenuAlert[] = [];

  for (const dateKey of getMenuOverviewDaysInWindow()) {
    for (const mealType of mealTypes) {
      const status = getMenuMealStatus(dateKey, mealType);
      if (status === "published") {
        continue;
      }

      alerts.push({
        id: `${dateKey}:${mealType}`,
        dateKey,
        mealType,
        dateLabel: formatCalendarDayLabel(dateKey),
        mealLabel: mealTypeLabels[mealType],
        message: alertMessageForStatus(status),
        status,
      });
    }
  }

  return alerts;
}

export function countMenuAlerts() {
  return getMissingMenuAlerts().length;
}

export function getJelovnikEditorHref(dateKey: string, mealType: MealType) {
  return `/kuhinja/jelovnik?date=${encodeURIComponent(dateKey)}&obrok=${mealType}`;
}

export function parseKitchenMenuDateParam(value: string | null) {
  if (!value || !parseDateKey(value)) {
    return getBookingTodayDateKey();
  }
  return value;
}

export function parseKitchenMenuMealParam(value: string | null): MealType {
  if (value === "breakfast" || value === "lunch" || value === "dinner") {
    return value;
  }
  return "lunch";
}

export function getMenuStatusLabel(status: MenuMealStatus) {
  switch (status) {
    case "published":
      return "Objavljen";
    case "draft_unsaved":
      return "Nesačuvane izmene";
    case "draft":
      return "Draft";
    case "published_empty":
      return "Prazan";
    case "missing":
    default:
      return "Nedostaje";
  }
}

function daysBetweenDateKeys(fromDateKey: string, toDateKey: string) {
  const from = parseDateKey(fromDateKey);
  const to = parseDateKey(toDateKey);
  if (!from || !to) {
    return 0;
  }

  const fromMs = new Date(from.year, from.month - 1, from.day).getTime();
  const toMs = new Date(to.year, to.month - 1, to.day).getTime();
  return Math.round((toMs - fromMs) / (24 * 60 * 60 * 1000));
}

export function getWeekDayKeys(weekStartDateKey: string, count = 7) {
  const start = parseDateKey(weekStartDateKey);
  if (!start) {
    return [];
  }

  return Array.from({ length: count }, (_, index) => toDateKey(addDays(start, index)));
}

export function getWeekStartForDate(
  dateKey: string,
  anchorDateKey: string = getBookingTodayDateKey(),
) {
  const diff = daysBetweenDateKeys(anchorDateKey, dateKey);
  const weekOffset = Math.floor(diff / 7) * 7;
  const anchor = parseDateKey(anchorDateKey);
  if (!anchor) {
    return getBookingTodayDateKey();
  }

  return toDateKey(addDays(anchor, weekOffset));
}

export function isDateInWeek(
  dateKey: string,
  weekStartDateKey: string,
  count = 7,
) {
  return getWeekDayKeys(weekStartDateKey, count).includes(dateKey);
}

export function formatWeekRangeLabel(weekStartDateKey: string, count = 7) {
  const keys = getWeekDayKeys(weekStartDateKey, count);
  if (keys.length === 0) {
    return weekStartDateKey;
  }

  const first = formatCalendarDayLabel(keys[0]);
  const last = formatCalendarDayLabel(keys[keys.length - 1]);

  if (keys.length === 1 || first === last) {
    return first;
  }

  const firstParts = first.split(" ");
  const lastParts = last.split(" ");

  if (firstParts.length >= 3 && lastParts.length >= 3) {
    const sameMonthYear =
      firstParts[1] === lastParts[1] && firstParts[2] === lastParts[2];
    if (sameMonthYear) {
      return `${firstParts[0]} – ${lastParts[0]} ${lastParts[1]} ${lastParts[2]}`;
    }
  }

  return `${first} – ${last}`;
}

export function shiftWeekStart(weekStartDateKey: string, weeks: number) {
  const start = parseDateKey(weekStartDateKey);
  if (!start) {
    return getBookingTodayDateKey();
  }

  return toDateKey(addDays(start, weeks * 7));
}

export function formatMealDishSummary(meal: MenuMealOverview) {
  const names = meal.slots.flatMap((slot) => slot.dishNames);
  if (names.length === 0) {
    return "Nema jela u meniju";
  }
  return names.join(" · ");
}
