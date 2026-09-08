import { getWeekdayLabelForDateKey } from "@/lib/calendar-utils";
import {
  getDailyMenu,
  getSyncedDailyMenu,
  publishScheduleMenus,
  runJelovnikBatchUpdate,
  runWithJelovnikRemoteSyncSuspended,
  upsertDailyMenu,
} from "@/lib/kuhinja-jelovnik-store";
import type { DailyMenuEntry, DailyMenuSlot } from "@/lib/kuhinja-mock";
import { kitchenSlotOrder } from "@/lib/kuhinja-mock";
import {
  getMenuMealStatus,
  getWeekDayKeys,
  shiftWeekStart,
  type MenuMealStatus,
} from "@/lib/kuhinja-menu-overview";
import type { MealType } from "@/lib/meal-types";

const mealTypes: MealType[] = ["breakfast", "lunch", "dinner"];

export type WeeklyScheduleMeal = {
  mealType: MealType;
  slots: DailyMenuSlot[];
  status: MenuMealStatus;
  touchedInSchedule?: boolean;
};

export type WeeklyScheduleDay = {
  dateKey: string;
  weekdayLabel: string;
  meals: Record<MealType, WeeklyScheduleMeal>;
};

export type WeeklySchedule = {
  weekStartDateKey: string;
  days: WeeklyScheduleDay[];
  generatedAt: string;
};

function emptySlots(): DailyMenuSlot[] {
  return kitchenSlotOrder.map((slotId) => ({
    slotId,
    dishIds: [],
    dishStock: {},
  }));
}

function countDishesInSlots(slots: DailyMenuSlot[]) {
  return slots.reduce((total, slot) => total + slot.dishIds.length, 0);
}

function scheduleSlotsSignature(slots: DailyMenuSlot[]) {
  return JSON.stringify(
    slots.map((slot) => ({
      slotId: slot.slotId,
      dishIds: [...slot.dishIds].sort(),
      dishStock: slot.dishStock,
    })),
  );
}

export function areScheduleSlotsEqual(slotsA: DailyMenuSlot[], slotsB: DailyMenuSlot[]) {
  return scheduleSlotsSignature(slotsA) === scheduleSlotsSignature(slotsB);
}

function deriveScheduleMealStatus(
  dateKey: string,
  mealType: MealType,
  slots: DailyMenuSlot[],
): MenuMealStatus {
  if (countDishesInSlots(slots) === 0) {
    return "missing";
  }

  const synced = getSyncedDailyMenu(dateKey, mealType);
  if (synced?.published && areScheduleSlotsEqual(slots, synced.slots)) {
    return "published";
  }

  return "draft";
}

function pickMenuForImport(dateKey: string, mealType: MealType): DailyMenuEntry | null {
  const draft = getDailyMenu(dateKey, mealType);
  const synced = getSyncedDailyMenu(dateKey, mealType);

  if (draft && countDishesInSlots(draft.slots) > 0) {
    return draft;
  }

  if (synced && countDishesInSlots(synced.slots) > 0) {
    return synced;
  }

  return draft ?? synced;
}

function mealFromMenu(
  dateKey: string,
  mealType: MealType,
  menu: DailyMenuEntry | null,
  options?: { touchedInSchedule?: boolean },
): WeeklyScheduleMeal {
  const slots = menu ? structuredClone(menu.slots) : emptySlots();
  const status = deriveScheduleMealStatus(dateKey, mealType, slots);

  return {
    mealType,
    slots,
    status,
    touchedInSchedule: options?.touchedInSchedule ?? false,
  };
}

function buildScheduleDay(dateKey: string): WeeklyScheduleDay {
  return {
    dateKey,
    weekdayLabel: getWeekdayLabelForDateKey(dateKey),
    meals: {
      breakfast: mealFromMenu(dateKey, "breakfast", pickMenuForImport(dateKey, "breakfast")),
      lunch: mealFromMenu(dateKey, "lunch", pickMenuForImport(dateKey, "lunch")),
      dinner: mealFromMenu(dateKey, "dinner", pickMenuForImport(dateKey, "dinner")),
    },
  };
}

export function createEmptyWeeklySchedule(weekStartDateKey: string): WeeklySchedule {
  const dayKeys = getWeekDayKeys(weekStartDateKey);

  return {
    weekStartDateKey,
    days: dayKeys.map((dateKey) => buildScheduleDay(dateKey)),
    generatedAt: new Date().toISOString(),
  };
}

export function buildWeeklyScheduleFromJelovnik(weekStartDateKey: string): WeeklySchedule {
  return {
    ...createEmptyWeeklySchedule(weekStartDateKey),
    generatedAt: new Date().toISOString(),
  };
}

function mealFromCopiedSlots(mealType: MealType, slots: DailyMenuSlot[]): WeeklyScheduleMeal {
  const clonedSlots = structuredClone(slots);
  return {
    mealType,
    slots: clonedSlots,
    status: countDishesInSlots(clonedSlots) > 0 ? "draft" : "missing",
    touchedInSchedule: true,
  };
}

export function copyWeeklyScheduleFromPreviousWeek(weekStartDateKey: string): WeeklySchedule {
  const previousWeekStart = shiftWeekStart(weekStartDateKey, -1);
  const currentDayKeys = getWeekDayKeys(weekStartDateKey);
  const previousDayKeys = getWeekDayKeys(previousWeekStart);

  return {
    weekStartDateKey,
    days: currentDayKeys.map((dateKey, index) => {
      const previousDateKey = previousDayKeys[index] ?? dateKey;

      return {
        dateKey,
        weekdayLabel: getWeekdayLabelForDateKey(dateKey),
        meals: {
          breakfast: mealFromCopiedSlots(
            "breakfast",
            pickMenuForImport(previousDateKey, "breakfast")?.slots ?? emptySlots(),
          ),
          lunch: mealFromCopiedSlots(
            "lunch",
            pickMenuForImport(previousDateKey, "lunch")?.slots ?? emptySlots(),
          ),
          dinner: mealFromCopiedSlots(
            "dinner",
            pickMenuForImport(previousDateKey, "dinner")?.slots ?? emptySlots(),
          ),
        },
      };
    }),
    generatedAt: new Date().toISOString(),
  };
}

export function copyScheduleDayFromPreviousWeek(
  schedule: WeeklySchedule,
  targetDateKey: string,
): WeeklySchedule {
  const previousWeekStart = shiftWeekStart(schedule.weekStartDateKey, -1);
  const previousDayKeys = getWeekDayKeys(previousWeekStart);
  const targetDayIndex = schedule.days.findIndex((day) => day.dateKey === targetDateKey);
  if (targetDayIndex === -1) return schedule;

  const previousDateKey = previousDayKeys[targetDayIndex] ?? targetDateKey;

  return {
    ...schedule,
    days: schedule.days.map((day, index) => {
      if (index !== targetDayIndex) return day;
      return {
        ...day,
        meals: {
          breakfast: mealFromCopiedSlots(
            "breakfast",
            pickMenuForImport(previousDateKey, "breakfast")?.slots ?? emptySlots(),
          ),
          lunch: mealFromCopiedSlots(
            "lunch",
            pickMenuForImport(previousDateKey, "lunch")?.slots ?? emptySlots(),
          ),
          dinner: mealFromCopiedSlots(
            "dinner",
            pickMenuForImport(previousDateKey, "dinner")?.slots ?? emptySlots(),
          ),
        },
      };
    }),
    generatedAt: new Date().toISOString(),
  };
}

function refreshScheduleMealStatus(dateKey: string, meal: WeeklyScheduleMeal): WeeklyScheduleMeal {
  return {
    ...meal,
    status: deriveScheduleMealStatus(dateKey, meal.mealType, meal.slots),
  };
}

export function refreshScheduleStatuses(schedule: WeeklySchedule): WeeklySchedule {
  return {
    ...schedule,
    days: schedule.days.map((day) => ({
      ...day,
      meals: {
        breakfast: refreshScheduleMealStatus(day.dateKey, day.meals.breakfast),
        lunch: refreshScheduleMealStatus(day.dateKey, day.meals.lunch),
        dinner: refreshScheduleMealStatus(day.dateKey, day.meals.dinner),
      },
    })),
  };
}

function mergeScheduleMealWithJelovnik(
  dateKey: string,
  meal: WeeklyScheduleMeal,
): WeeklyScheduleMeal {
  if (meal.touchedInSchedule) {
    return {
      ...meal,
      status: deriveScheduleMealStatus(dateKey, meal.mealType, meal.slots),
    };
  }

  return mealFromMenu(dateKey, meal.mealType, pickMenuForImport(dateKey, meal.mealType));
}

export function mergeScheduleWithJelovnik(schedule: WeeklySchedule): WeeklySchedule {
  return {
    ...schedule,
    days: schedule.days.map((day) => ({
      ...day,
      meals: {
        breakfast: mergeScheduleMealWithJelovnik(day.dateKey, day.meals.breakfast),
        lunch: mergeScheduleMealWithJelovnik(day.dateKey, day.meals.lunch),
        dinner: mergeScheduleMealWithJelovnik(day.dateKey, day.meals.dinner),
      },
    })),
  };
}

export function updateScheduleMeal(
  schedule: WeeklySchedule,
  dateKey: string,
  mealType: MealType,
  slots: DailyMenuSlot[],
): WeeklySchedule {
  const clonedSlots = structuredClone(slots);
  const status = deriveScheduleMealStatus(dateKey, mealType, clonedSlots);

  return {
    ...schedule,
    days: schedule.days.map((day) => {
      if (day.dateKey !== dateKey) {
        return day;
      }

      return {
        ...day,
        meals: {
          ...day.meals,
          [mealType]: {
            mealType,
            slots: clonedSlots,
            status,
            touchedInSchedule: true,
          },
        },
      };
    }),
  };
}

export function scheduleHasPublishedTargets(schedule: WeeklySchedule) {
  for (const day of schedule.days) {
    for (const mealType of mealTypes) {
      const synced = getSyncedDailyMenu(day.dateKey, mealType);
      if (synced?.published) {
        return true;
      }
    }
  }

  return false;
}

export function scheduleHasUnappliedChanges(schedule: WeeklySchedule) {
  for (const day of schedule.days) {
    for (const mealType of mealTypes) {
      if (day.meals[mealType].status === "draft") {
        return true;
      }
    }
  }

  return false;
}

function shouldPublishScheduleMeal(meal: WeeklyScheduleMeal): boolean {
  return meal.status === "draft" && countDishesInSlots(meal.slots) > 0;
}

export function collectPublishTasks(schedule: WeeklySchedule) {
  const publishTasks: Array<{ dateKey: string; mealType: MealType }> = [];

  for (const day of schedule.days) {
    for (const mealType of mealTypes) {
      const meal = day.meals[mealType];
      if (!shouldPublishScheduleMeal(meal)) {
        continue;
      }

      publishTasks.push({ dateKey: day.dateKey, mealType });
    }
  }

  return publishTasks;
}

export async function applyWeeklyScheduleToJelovnik(schedule: WeeklySchedule) {
  const publishTasks = collectPublishTasks(schedule);
  const mealsToPublish = publishTasks
    .map(({ dateKey, mealType }) => {
      const day = schedule.days.find((entry) => entry.dateKey === dateKey);
      const meal = day?.meals[mealType];
      if (!meal) {
        return null;
      }

      return {
        dateKey,
        mealType,
        slots: structuredClone(meal.slots),
      };
    })
    .filter((meal): meal is NonNullable<typeof meal> => meal !== null);

  await runWithJelovnikRemoteSyncSuspended(() =>
    runJelovnikBatchUpdate(async () => {
      for (const meal of mealsToPublish) {
        upsertDailyMenu({
          id: `menu-${meal.dateKey}-${meal.mealType}`,
          dateKey: meal.dateKey,
          mealType: meal.mealType,
          slots: meal.slots,
          published: false,
        });
      }

      await publishScheduleMenus(mealsToPublish);
    }),
  );
}

export function finalizeScheduleAfterApply(schedule: WeeklySchedule): WeeklySchedule {
  return {
    ...schedule,
    generatedAt: new Date().toISOString(),
    days: schedule.days.map((day) => ({
      ...day,
      meals: {
        breakfast: finalizeScheduleMeal(day.dateKey, day.meals.breakfast),
        lunch: finalizeScheduleMeal(day.dateKey, day.meals.lunch),
        dinner: finalizeScheduleMeal(day.dateKey, day.meals.dinner),
      },
    })),
  };
}

function finalizeScheduleMeal(dateKey: string, meal: WeeklyScheduleMeal): WeeklyScheduleMeal {
  if (countDishesInSlots(meal.slots) === 0) {
    return {
      ...meal,
      status: "missing",
      touchedInSchedule: false,
    };
  }

  return {
    ...meal,
    status: getMenuMealStatus(dateKey, meal.mealType),
    touchedInSchedule: false,
  };
}

export const weeklyScheduleMealTypes = mealTypes;
