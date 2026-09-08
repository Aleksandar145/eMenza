import { parseDateKey } from "@/lib/calendar-utils";
import type { UserReligion } from "@/lib/user-preferences";

export type LiturgicalPeriod = "veliki_post" | "ramazan" | "none";

export type LiturgicalDayInfo = {
  period: LiturgicalPeriod;
  isOrthodoxFastDay: boolean;
  isPosnaDay: boolean;
  label: string | null;
  shortLabel: string | null;
};

/** Pravoslavni Veliki post 2026 — mock opseg. */
export const VELIKI_POST_START = "2026-02-23";
export const VELIKI_POST_END = "2026-04-12";

/** Ramazan 2026 — mock opseg. */
export const RAMAZAN_START = "2026-02-24";
export const RAMAZAN_END = "2026-03-26";

function compareDateKeys(a: string, b: string) {
  return a.localeCompare(b);
}

function isDateInRange(dateKey: string, start: string, end: string) {
  return compareDateKeys(dateKey, start) >= 0 && compareDateKeys(dateKey, end) <= 0;
}

export function isOrthodoxWednesdayOrFriday(dateKey: string) {
  const date = parseDateKey(dateKey);
  if (!date) {
    return false;
  }

  const dayOfWeek = new Date(date.year, date.month - 1, date.day).getDay();
  return dayOfWeek === 3 || dayOfWeek === 5;
}

export function isInVelikiPost(dateKey: string) {
  return isDateInRange(dateKey, VELIKI_POST_START, VELIKI_POST_END);
}

export function isInRamadan(dateKey: string) {
  return isDateInRange(dateKey, RAMAZAN_START, RAMAZAN_END);
}

export function getLiturgicalPeriod(
  dateKey: string,
  religion: UserReligion | "" = "",
): LiturgicalPeriod {
  if (religion === "islam") {
    return isInRamadan(dateKey) ? "ramazan" : "none";
  }

  if (religion === "hristijanstvo") {
    return isInVelikiPost(dateKey) ? "veliki_post" : "none";
  }

  return "none";
}

export function getLiturgicalDayInfo(
  dateKey: string,
  religion: UserReligion | "" = "",
): LiturgicalDayInfo {
  const period = getLiturgicalPeriod(dateKey, religion);
  const orthodoxFastDay = isOrthodoxWednesdayOrFriday(dateKey);
  const showOrthodoxFastDay =
    orthodoxFastDay &&
    (religion === "hristijanstvo" || religion === "ne_zelim" || religion === "");
  const isPosnaDay = period === "veliki_post" || period === "ramazan" || showOrthodoxFastDay;

  if (period === "ramazan") {
    return {
      period,
      isOrthodoxFastDay: orthodoxFastDay,
      isPosnaDay,
      label: "Ramazan — posni meni",
      shortLabel: "Ramazan",
    };
  }

  if (period === "veliki_post") {
    return {
      period,
      isOrthodoxFastDay: orthodoxFastDay,
      isPosnaDay,
      label: "Veliki post — posni meni dostupan",
      shortLabel: "Posni meni",
    };
  }

  if (showOrthodoxFastDay) {
    return {
      period,
      isOrthodoxFastDay: true,
      isPosnaDay: true,
      label: "Posna sreda / petak",
      shortLabel: "Posno",
    };
  }

  return {
    period: "none",
    isOrthodoxFastDay: false,
    isPosnaDay: false,
    label: null,
    shortLabel: null,
  };
}

export function shouldSuggestPosnoHighlight(
  religion: "islam" | "hristijanstvo" | "ne_zelim" | "",
  dateKey: string,
  preferPosnoMeals = false,
) {
  if (!preferPosnoMeals) {
    return false;
  }

  const period = getLiturgicalPeriod(dateKey, religion);
  const orthodoxFastDay = isOrthodoxWednesdayOrFriday(dateKey);

  if (religion === "hristijanstvo") {
    return period === "veliki_post" || orthodoxFastDay;
  }

  if (religion === "islam") {
    return period === "ramazan";
  }

  return false;
}
