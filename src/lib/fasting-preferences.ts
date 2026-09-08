import { formatCalendarDateLabel, parseDateKey } from "@/lib/calendar-utils";
import {
  RAMAZAN_END,
  RAMAZAN_START,
  VELIKI_POST_END,
  VELIKI_POST_START,
  getLiturgicalDayInfo,
  isInRamadan,
  isInVelikiPost,
  isOrthodoxWednesdayOrFriday,
  shouldSuggestPosnoHighlight,
} from "@/lib/liturgical-calendar";
import type { MealType } from "@/lib/dashboard-mock";
import type { UserReligion } from "@/lib/user-preferences";

export type FastingChoice = "postim" | "ne_postim" | "preskoci";

export type FastingPreferences = {
  /** Hrišćanstvo — stalni izbor u podešavanjima za posnu sredu i petak. */
  sredaPetak: FastingChoice | null;
  /** Hrišćanstvo — izbor preko popupa 3 dana pre Velikog posta. */
  velikiPost2026: FastingChoice | null;
  /** Islam — popup 3 dana pre ramazana ili izbor u Profilu tokom sezone. */
  ramazan2026: FastingChoice | null;
};

export type FastingPeriodKey = "sreda_petak" | "veliki_post" | "ramazan";

export type OptInFastingPeriodKey = "veliki_post" | "ramazan";

export type FastingOptInPrompt = {
  period: OptInFastingPeriodKey;
  title: string;
  message: string;
  startLabel: string;
  daysUntilStart: number;
};

const PRE_FASTING_WINDOW_DAYS = 3;

function daysBetween(fromKey: string, toKey: string) {
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  if (!from || !to) {
    return 0;
  }

  const fromUtc = Date.UTC(from.year, from.month - 1, from.day);
  const toUtc = Date.UTC(to.year, to.month - 1, to.day);
  return Math.round((toUtc - fromUtc) / (1000 * 60 * 60 * 24));
}

function isWithinPreFastingWindow(dateKey: string, startKey: string) {
  const daysUntil = daysBetween(dateKey, startKey);
  return daysUntil >= 1 && daysUntil <= PRE_FASTING_WINDOW_DAYS;
}

function isInOptInFastingPeriod(dateKey: string, period: OptInFastingPeriodKey) {
  return period === "veliki_post" ? isInVelikiPost(dateKey) : isInRamadan(dateKey);
}

export function getSettingsFastingPeriod(religion: UserReligion | ""): "sreda_petak" | null {
  if (religion === "hristijanstvo") {
    return "sreda_petak";
  }

  return null;
}

export function getOptInFastingPeriod(religion: UserReligion | ""): OptInFastingPeriodKey | null {
  if (religion === "hristijanstvo") {
    return "veliki_post";
  }

  if (religion === "islam") {
    return "ramazan";
  }

  return null;
}

export function getFastingChoiceForPeriod(
  prefs: FastingPreferences,
  period: FastingPeriodKey,
): FastingChoice | null {
  if (period === "sreda_petak") {
    return prefs.sredaPetak;
  }

  if (period === "veliki_post") {
    return prefs.velikiPost2026;
  }

  return prefs.ramazan2026;
}

export function setFastingChoiceForPeriod(
  prefs: FastingPreferences,
  period: FastingPeriodKey,
  choice: FastingChoice,
): FastingPreferences {
  if (period === "sreda_petak") {
    return { ...prefs, sredaPetak: choice };
  }

  if (period === "veliki_post") {
    return { ...prefs, velikiPost2026: choice };
  }

  return { ...prefs, ramazan2026: choice };
}

function getOptInPeriodStartEnd(period: OptInFastingPeriodKey) {
  if (period === "veliki_post") {
    return { start: VELIKI_POST_START, end: VELIKI_POST_END };
  }

  return { start: RAMAZAN_START, end: RAMAZAN_END };
}

export function getFastingOptInPrompt(
  religion: UserReligion | "",
  dateKey: string,
  prefs: FastingPreferences,
): FastingOptInPrompt | null {
  const period = getOptInFastingPeriod(religion);
  if (!period) {
    return null;
  }

  const choice = getFastingChoiceForPeriod(prefs, period);
  if (choice !== null) {
    return null;
  }

  const { start } = getOptInPeriodStartEnd(period);
  const inPreWindow = isWithinPreFastingWindow(dateKey, start);
  const inPeriod = isInOptInFastingPeriod(dateKey, period);

  if (!inPreWindow && !inPeriod) {
    return null;
  }

  const daysUntilStart = Math.max(0, daysBetween(dateKey, start));
  const startLabel = formatCalendarDateLabel(start);

  if (period === "veliki_post") {
    return {
      period,
      title: "Počinje Veliki post",
      message:
        daysUntilStart > 0
          ? `Veliki post počinje ${startLabel} (za ${daysUntilStart} ${daysUntilStart === 1 ? "dan" : "dana"}). Da li planirate da postite tokom celog Velikog posta? Ovaj izbor je odvojen od vaše podešavanja za posnu sredu i petak.`
          : "Veliki post je u toku. Da li postite tokom celog perioda? Prijavite se za dnevni posni kalendar i personalizovana obaveštenja.",
      startLabel,
      daysUntilStart,
    };
  }

  return {
    period,
    title: "Počinje ramazan",
    message:
      daysUntilStart > 0
        ? `Ramazan počinje ${startLabel} (za ${daysUntilStart} ${daysUntilStart === 1 ? "dan" : "dana"}). Da li planirate da postite tokom celog ramazana? Prijavom dobijate dnevni posni kalendar, obaveštenja za meni i opciju „poneti“ obrok za iftar.`
        : "Ramazan je u toku. Da li postite? Prijavite se za dnevni posni kalendar i obaveštenja o posnom meniju.",
    startLabel,
    daysUntilStart,
  };
}

export function shouldPreferPosnoMeals(
  religion: UserReligion | "",
  dateKey: string,
  prefs: FastingPreferences,
) {
  if (religion === "hristijanstvo") {
    if (isInVelikiPost(dateKey) && prefs.velikiPost2026 === "postim") {
      return true;
    }

    if (isOrthodoxWednesdayOrFriday(dateKey) && prefs.sredaPetak === "postim") {
      return true;
    }

    return false;
  }

  if (religion === "islam") {
    return isInRamadan(dateKey) && prefs.ramazan2026 === "postim";
  }

  return false;
}

/** Liturgijski prikaz usklađen sa izborom posta (npr. „Posno“ na sre/pet čak i tokom VP). */
export function getLiturgicalDisplayInfo(
  religion: UserReligion | "",
  dateKey: string,
  prefs: FastingPreferences,
) {
  if (
    religion === "hristijanstvo" &&
    prefs.sredaPetak === "postim" &&
    isOrthodoxWednesdayOrFriday(dateKey) &&
    !(isInVelikiPost(dateKey) && prefs.velikiPost2026 === "postim")
  ) {
    return {
      period: isInVelikiPost(dateKey) ? ("veliki_post" as const) : ("none" as const),
      isOrthodoxFastDay: true,
      isPosnaDay: true,
      label: "Posna sreda / petak",
      shortLabel: "Posno",
    };
  }

  return getLiturgicalDayInfo(dateKey, religion);
}

export function shouldShowPosnoMealsForDate(
  religion: UserReligion | "",
  dateKey: string,
  prefs: FastingPreferences,
) {
  return shouldSuggestPosnoHighlight(
    religion,
    dateKey,
    shouldPreferPosnoMeals(religion, dateKey, prefs),
  );
}

export function isUserOptedInToFasting(
  religion: UserReligion | "",
  dateKey: string,
  prefs: FastingPreferences,
) {
  return shouldPreferPosnoMeals(religion, dateKey, prefs);
}

export function createEmptyFastingPreferences(): FastingPreferences {
  return {
    sredaPetak: null,
    velikiPost2026: null,
    ramazan2026: null,
  };
}

export function getFastingChoiceStatusLabel(choice: FastingChoice | null) {
  if (choice === "postim") {
    return "Postim";
  }

  if (choice === "ne_postim") {
    return "Ne postim";
  }

  if (choice === "preskoci") {
    return "Preskoči";
  }

  return "Nije izabrano";
}

export type FastingChoiceStatusTone = "neutral" | "active" | "muted";

export function getFastingChoiceStatusTone(choice: FastingChoice | null): FastingChoiceStatusTone {
  if (choice === "postim") {
    return "active";
  }

  if (choice === "ne_postim") {
    return "muted";
  }

  return "neutral";
}

export function normalizeFastingPreferences(
  fasting: Partial<FastingPreferences> | null | undefined,
): FastingPreferences {
  const empty = createEmptyFastingPreferences();

  if (!fasting) {
    return empty;
  }

  return {
    sredaPetak: fasting.sredaPetak ?? empty.sredaPetak,
    velikiPost2026: fasting.velikiPost2026 ?? empty.velikiPost2026,
    ramazan2026: fasting.ramazan2026 ?? empty.ramazan2026,
  };
}

export const FASTING_CONFIG_VERSION = 4;

/** Migracija fasting polja iz starijih verzija podešavanja. */
export function migrateFastingPreferences(
  fasting: Partial<FastingPreferences> | undefined,
  fromVersion = 0,
): FastingPreferences {
  const base = normalizeFastingPreferences(fasting);

  if (fromVersion < 3) {
    if (base.velikiPost2026 === null && base.ramazan2026 === "postim") {
      return createEmptyFastingPreferences();
    }
  }

  if (fromVersion < FASTING_CONFIG_VERSION) {
    const legacyVeliki = base.velikiPost2026;

    return {
      sredaPetak: base.sredaPetak ?? legacyVeliki,
      velikiPost2026: null,
      ramazan2026: base.ramazan2026,
    };
  }

  return base;
}

export function supportsFastingSettings(religion: UserReligion | "") {
  return religion === "hristijanstvo";
}

export function clearFastingChoiceForPeriod(
  prefs: FastingPreferences,
  period: FastingPeriodKey,
): FastingPreferences {
  if (period === "sreda_petak") {
    return { ...prefs, sredaPetak: null };
  }

  if (period === "veliki_post") {
    return { ...prefs, velikiPost2026: null };
  }

  return { ...prefs, ramazan2026: null };
}

export function isOptInFastingSeasonActive(religion: UserReligion | "", dateKey: string) {
  const period = getOptInFastingPeriod(religion);
  if (!period) {
    return false;
  }

  const { start } = getOptInPeriodStartEnd(period);
  return isWithinPreFastingWindow(dateKey, start) || isInOptInFastingPeriod(dateKey, period);
}

/** Večera tokom ramazana — islam + postim — nudi izbor u menzi / poneti. */
export function shouldOfferIftarTakeaway(
  religion: UserReligion | "",
  dateKey: string,
  mealType: MealType,
  fasting: FastingPreferences,
) {
  return (
    mealType === "dinner" &&
    religion === "islam" &&
    isInRamadan(dateKey) &&
    shouldPreferPosnoMeals(religion, dateKey, fasting)
  );
}
