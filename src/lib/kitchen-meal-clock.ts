import { formatCalendarDayLabel, getMealPickupWindow } from "@/lib/dashboard-mock";
import { getAppNow } from "@/lib/date-utils";
import type { MealType } from "@/lib/meal-types";

export type KitchenMealCountdownMode = "serving_end" | "next_start" | "none";

export type KitchenMealClockState = {
  mealType: MealType | null;
  mealLabel: string;
  phaseLabel: string;
  dateLabel: string;
  currentTime: string;
  countdown: { h: number; m: number; s: number } | null;
  countdownPrefix: string;
  countdownMode: KitchenMealCountdownMode;
  isServing: boolean;
  /** Obrok čiji meni se prikazuje na šalteru (trenutni ili sledeći). */
  menuMealType: MealType | null;
  isUpcomingMenu: boolean;
};

/** Koristi test vreme aplikacije kada je aktivno. */
export function getKitchenCounterNow(realNow: Date = new Date()): Date {
  return getAppNow(realNow);
}

const mealOrder: MealType[] = ["breakfast", "lunch", "dinner"];

const mealLabels: Record<MealType, string> = {
  breakfast: "Doručak",
  lunch: "Ručak",
  dinner: "Večera",
};

const phaseLabels: Record<MealType, string> = {
  breakfast: "doručka",
  lunch: "ručka",
  dinner: "večere",
};

type ParsedWindow = {
  mealType: MealType;
  mealLabel: string;
  phaseLabel: string;
  startMinutes: number;
  endMinutes: number;
  startLabel: string;
};

function parseTimeToMinutes(value: string): number {
  const [hours, minutes] = value.trim().split(":").map(Number);
  return hours * 60 + minutes;
}

function parseMealWindow(dateKey: string, mealType: MealType): ParsedWindow | null {
  const windowText = getMealPickupWindow(dateKey, mealType);
  const match = windowText.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
  if (!match) {
    return null;
  }

  return {
    mealType,
    mealLabel: mealLabels[mealType],
    phaseLabel: phaseLabels[mealType],
    startMinutes: parseTimeToMinutes(match[1]),
    endMinutes: parseTimeToMinutes(match[2]),
    startLabel: match[1],
  };
}

function formatClockTime(now: Date): string {
  return now.toLocaleTimeString("sr-RS", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function splitCountdown(totalSeconds: number): { h: number; m: number; s: number } {
  const clamped = Math.max(0, totalSeconds);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  return { h, m, s };
}

export function formatCountdown(countdown: { h: number; m: number; s: number }): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(countdown.h)}:${pad(countdown.m)}:${pad(countdown.s)}`;
}

function getNowMinutes(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
}

function getNowSeconds(now: Date): number {
  return getNowMinutes(now) * 60 + now.getSeconds();
}

export function getKitchenMealClockState(dateKey: string, now: Date): KitchenMealClockState {
  const dateLabel = formatCalendarDayLabel(dateKey);
  const currentTime = formatClockTime(now);
  const windows = mealOrder
    .map((mealType) => parseMealWindow(dateKey, mealType))
    .filter((entry): entry is ParsedWindow => entry !== null);

  const nowSeconds = getNowSeconds(now);

  for (const window of windows) {
    const startSeconds = window.startMinutes * 60;
    const endSeconds = window.endMinutes * 60;

    if (nowSeconds >= startSeconds && nowSeconds < endSeconds) {
      return {
        mealType: window.mealType,
        mealLabel: window.mealLabel,
        phaseLabel: window.phaseLabel,
        dateLabel,
        currentTime,
        countdown: splitCountdown(endSeconds - nowSeconds),
        countdownPrefix: `${window.mealLabel} se završava za`,
        countdownMode: "serving_end",
        isServing: true,
        menuMealType: window.mealType,
        isUpcomingMenu: false,
      };
    }
  }

  const nowMinutes = getNowMinutes(now);
  const nextWindow = windows.find((window) => window.startMinutes > nowMinutes);

  if (nextWindow) {
    const startSeconds = nextWindow.startMinutes * 60;
    return {
      mealType: null,
      mealLabel: nextWindow.mealLabel,
      phaseLabel: nextWindow.phaseLabel,
      dateLabel,
      currentTime,
      countdown: splitCountdown(startSeconds - nowSeconds),
      countdownPrefix: "Sledeći obrok počinje za:",
      countdownMode: "next_start",
      isServing: false,
      menuMealType: nextWindow.mealType,
      isUpcomingMenu: true,
    };
  }

  return {
    mealType: null,
    mealLabel: "",
    phaseLabel: "",
    dateLabel,
    currentTime,
    countdown: null,
    countdownPrefix: "Van radnog vremena menze",
    countdownMode: "none",
    isServing: false,
    menuMealType: null,
    isUpcomingMenu: false,
  };
}
