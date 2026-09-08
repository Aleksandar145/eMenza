import {
  addDays,
  buildMonthGrid,
  formatCalendarDateLabel,
  formatMonthYearLabel,
  getWeekdayLabelForDateKey,
  parseDateKey,
  toDateKey,
  type CalendarDate,
} from "@/lib/calendar-utils";
import { canBookMealSlot, getBookingTodayDateKey, getFirstBookableMealType, canCancelMealSlot } from "@/lib/meal-booking-window";
import { getAppDateKey, getAppNow } from "@/lib/date-utils";
import { resolveEffectiveReservationStatus } from "@/lib/meal-reservation-status";
import { getTodayFocusMealType, isWithinPickupWindow } from "@/lib/meal-pickup-window";
import { sortMealTypes } from "@/lib/meal-order";
import {
  getReservationAdvanceDays,
  getWorkingHours as getWorkingHoursFromAdminStore,
  isDateClosedForReservation,
  isReservationEnabled,
} from "@/lib/admin-system-store";
import { isMealTypeInWorkingHours } from "@/lib/schedule-utils";
import type { LucideIcon } from "lucide-react";
import { Carrot, Soup, UtensilsCrossed } from "lucide-react";
import type { MealType, WorkingHoursRow } from "@/lib/meal-types";

export type { MealType, WorkingHoursRow };

export type CalendarDayData = {
  day: number;
  dateKey: string;
  muted?: boolean;
  outsideMonth?: boolean;
  selected?: boolean;
  weekend?: boolean;
  meals?: MealType[];
};

export type MealCountCard = {
  label: string;
  type: MealType;
  count: number;
  icon: LucideIcon;
};

export type MealDetailsRow = {
  glavnoJelo: string;
  dodatak: string;
  salata: string;
  obrok: string;
  isPosno?: boolean;
};

export type MealReservationStatus =
  | "iskorisceno"
  | "propusteno"
  | "aktivno"
  | "zakazano"
  | "nerezervisano";

export type MealPickupMode = "u_menzi" | "poneti";

export const mealPickupModeLabels: Record<MealPickupMode, string> = {
  u_menzi: "U menzi",
  poneti: "Poneti (iftar paket)",
};

export type MealDetailsSection = {
  title: string;
  type: MealType;
  items?: MealDetailsRow;
  muted?: boolean;
  status: MealReservationStatus;
  isPosno?: boolean;
  posnoMenuAvailable?: boolean;
  pickupMode?: MealPickupMode;
};

export const profileAvatarUrl = "/dashboard/profile-avatar.png";

export const notificationIconUrl = "/dashboard/icon-notification.svg";

export const helpIconUrl = "/dashboard/icon-help.svg";

export const studentProfile = {
  name: "Marija Simic",
  subtitle: "Student  |  2021/2023",
};

export const mealCountCards: MealCountCard[] = [
  {
    label: "Doručak",
    type: "breakfast",
    count: 8,
    icon: Soup,
  },
  {
    label: "Ručak",
    type: "lunch",
    count: 5,
    icon: UtensilsCrossed,
  },
  {
    label: "Večera",
    type: "dinner",
    count: 6,
    icon: Carrot,
  },
];

export const accountBalance = {
  amount: "2,350.00",
  currency: "din",
  maskedNumber: "**** **** **** 3456",
  mealsEstimate: 13,
};

export const servingFoodImageUrl = "/dashboard/serving-food.svg";

const _now = new Date();
export const calendarMonth = new Intl.DateTimeFormat("sr-Latn", { month: "short" }).format(_now);

export const calendarYear = _now.getFullYear();

/** Dinamički „danas" — uvek prikazuje trenutni realni datum */
export const calendarTodayDate: CalendarDate = {
  year: _now.getFullYear(),
  month: _now.getMonth() + 1,
  day: _now.getDate(),
};

export const calendarTodayDateKey = toDateKey(calendarTodayDate);

export function getAvailableCalendarWindow() {
  return getReservationAdvanceDays();
}

const SEED_RESERVATIONS_BY_DATE_KEY: Record<string, MealType[]> = {
  "2026-03-03": ["breakfast", "lunch"],
  "2026-03-04": ["lunch", "dinner"],
  "2026-03-05": ["lunch"],
  "2026-03-06": ["breakfast"],
};

type ReservedMealDetail = {
  items: MealDetailsRow;
  status: Exclude<MealReservationStatus, "nerezervisano">;
  muted?: boolean;
  isPosno?: boolean;
  pickupMode?: MealPickupMode;
  totalRsd?: number;
  cardId?: string;
};

/** Dostupnost posnog menija po danu/obroku (i kad nije rezervisano). */
const POSNO_MENU_AVAILABILITY: Record<string, Partial<Record<MealType, boolean>>> = {
  "2026-03-03": { lunch: true, dinner: true },
  "2026-03-04": { lunch: true, dinner: true },
  "2026-03-05": { lunch: true, dinner: true },
  "2026-03-06": { breakfast: true, lunch: true, dinner: true },
  "2026-03-07": { lunch: true, dinner: true },
  "2026-03-08": { lunch: true },
  "2026-03-09": { lunch: true, dinner: true },
};

const POSNO_MENU_PREVIEW: Partial<Record<MealType, MealDetailsRow>> = {
  breakfast: {
    glavnoJelo: "Kajgana sa pečurkama",
    dodatak: "Tost",
    salata: "Paradajz",
    obrok: "Jabuka",
    isPosno: true,
  },
  lunch: {
    glavnoJelo: "Pasulj prebranac",
    dodatak: "Pirinač",
    salata: "Kupus salata",
    obrok: "Kompot",
    isPosno: true,
  },
  dinner: {
    glavnoJelo: "Rižoto sa pečurkama",
    dodatak: "Integralni hleb",
    salata: "Rukola",
    obrok: "Orašasti mix",
    isPosno: true,
  },
};

const SEED_MEAL_DETAILS_BY_DATE_KEY: Record<
  string,
  Partial<Record<MealType, ReservedMealDetail>>
> = {
  "2026-03-03": {
    breakfast: {
      status: "iskorisceno",
      items: {
        glavnoJelo: "Kajgana sa pečurkama",
        dodatak: "Tost",
        salata: "Paradajz",
        obrok: "Jabuka",
        isPosno: true,
      },
    },
    lunch: {
      status: "aktivno",
      isPosno: true,
      items: {
        glavnoJelo: "Pasulj prebranac",
        dodatak: "Pirinač",
        salata: "Kupus salata",
        obrok: "Kompot",
        isPosno: true,
      },
    },
  },
  "2026-03-04": {
    lunch: {
      status: "zakazano",
      isPosno: true,
      items: {
        glavnoJelo: "Rižoto sa pečurkama",
        dodatak: "Integralni hleb",
        salata: "Rukola",
        obrok: "Orašasti mix",
        isPosno: true,
      },
    },
    dinner: {
      status: "zakazano",
      isPosno: true,
      items: {
        glavnoJelo: "Pirinač sa povrćem",
        dodatak: "Pita sa spanaćem",
        salata: "Mešana salata",
        obrok: "Baklava (posna)",
        isPosno: true,
      },
    },
  },
  "2026-03-05": {
    lunch: {
      status: "zakazano",
      items: {
        glavnoJelo: "Ćevapčići",
        dodatak: "Lepinja",
        salata: "Ajvar",
        obrok: "Kolač",
      },
    },
  },
  "2026-03-06": {
    breakfast: {
      status: "zakazano",
      items: {
        glavnoJelo: "Kajgana",
        dodatak: "Slanina",
        salata: "Paradajz",
        obrok: "Kroasan",
      },
    },
  },
};

function cloneSeedReservations() {
  return structuredClone(SEED_RESERVATIONS_BY_DATE_KEY);
}

function cloneSeedMealDetails() {
  return structuredClone(SEED_MEAL_DETAILS_BY_DATE_KEY);
}

let reservationsByDateKey = cloneSeedReservations();
let mealDetailsByDateKey = cloneSeedMealDetails();

export function resetMockReservations() {
  reservationsByDateKey = cloneSeedReservations();
  mealDetailsByDateKey = cloneSeedMealDetails();
}

export function getMonthGrid(year: number, month: number) {
  return buildMonthGrid(year, month, reservationsByDateKey);
}

export function getAvailableCalendarDays() {
  return getPlanningWeekDays(getReservationAdvanceDays());
}

export type PlanningWeekDay = CalendarDayData & {
  isReservationAvailable: boolean;
};

export function getPlanningWeekDays(count = 7, startDateKey?: string): PlanningWeekDay[] {
  const resolvedStartKey = startDateKey ?? getBookingTodayDateKey();
  const startDate = parseDateKey(resolvedStartKey) ?? calendarTodayDate;

  return Array.from({ length: count }, (_, index) => {
    const date = addDays(startDate, index);
    const dateKey = toDateKey(date);

    return {
      day: date.day,
      dateKey,
      weekend: [0, 6].includes(new Date(date.year, date.month - 1, date.day).getDay()),
      meals: sortMealTypes(reservationsByDateKey[dateKey] ?? []),
      isReservationAvailable: isDayAvailableForReservation(dateKey, resolvedStartKey),
    };
  });
}

export function getDayReservationSummary(dateKey: string) {
  const meals = sortMealTypes(reservationsByDateKey[dateKey] ?? []);

  return {
    reserved: meals.length,
    total: mealOrder.length,
    meals,
  };
}

export function isDayAvailableForReservation(
  dateKey: string,
  todayDateKey: string = getBookingTodayDateKey(),
) {
  if (!isReservationEnabled()) {
    return false;
  }

  if (isDateClosedForReservation(dateKey)) {
    return false;
  }

  const date = parseDateKey(dateKey);
  if (!date) {
    return false;
  }

  const window = getReservationAdvanceDays();
  const today = parseDateKey(todayDateKey) ?? calendarTodayDate;

  for (let offset = 0; offset < window; offset += 1) {
    const allowed = addDays(today, offset);
    if (
      allowed.year === date.year &&
      allowed.month === date.month &&
      allowed.day === date.day
    ) {
      return true;
    }
  }

  return false;
}

export function clampToAvailableReservationDay(dateKey: string) {
  if (isDayAvailableForReservation(dateKey)) {
    return dateKey;
  }

  return getBookingTodayDateKey();
}

export { formatMonthYearLabel, getWeekdayLabelForDateKey };

export function formatCalendarDayLabel(dateKey: string) {
  return formatCalendarDateLabel(dateKey);
}

export const weekdays = [
  { label: "Pon", weekend: false },
  { label: "Uto", weekend: false },
  { label: "Sre", weekend: false },
  { label: "Čet", weekend: false },
  { label: "Pet", weekend: false },
  { label: "Sub", weekend: true },
  { label: "Ned", weekend: true },
];

export const workingHours: WorkingHoursRow[] = [
  {
    meal: "Doručak",
    type: "breakfast",
    weekday: "08:30 - 11:00",
    weekend: "08:30 - 10:00",
  },
  {
    meal: "Ručak",
    type: "lunch",
    weekday: "11:30 - 15:00",
    weekend: "11:30 - 13:00",
  },
  {
    meal: "Večera",
    type: "dinner",
    weekday: "17:30 - 20:00",
    weekend: "17:30 - 19:00",
  },
];

function isWeekendDateKey(dateKey: string) {
  const date = parseDateKey(dateKey);
  if (!date) {
    return false;
  }

  const dayOfWeek = new Date(date.year, date.month - 1, date.day).getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

export function getMealPickupWindow(dateKey: string, mealType: MealType) {
  const row = getWorkingHoursFromAdminStore().find((entry) => entry.type === mealType);
  if (!row) {
    return "";
  }

  return isWeekendDateKey(dateKey) ? row.weekend : row.weekday;
}

export const mealDetailsDate = "3. mart 2026";

export const nextReservationDate = "4. mart";

const mealTitles: Record<MealType, string> = {
  breakfast: "Doručak",
  lunch: "Ručak",
  dinner: "Večera",
};

const mealOrder: MealType[] = ["breakfast", "lunch", "dinner"];

export function getMealDetailsForDay(dateKey: string) {
  const reservedTypes = new Set(reservationsByDateKey[dateKey] ?? []);
  const dayMenus = mealDetailsByDateKey[dateKey] ?? {};
  const workingHours = getWorkingHoursFromAdminStore();

  const sections: MealDetailsSection[] = mealOrder
    .filter((type) => isMealTypeInWorkingHours(dateKey, type, workingHours))
    .map((type) => {
      const title = mealTitles[type];
      const posnoMenuAvailable = Boolean(POSNO_MENU_AVAILABILITY[dateKey]?.[type]);

      if (!reservedTypes.has(type)) {
        return {
          title,
          type,
          status: "nerezervisano" as const,
          posnoMenuAvailable,
        };
      }

      const detail = dayMenus[type];
      if (!detail) {
        return {
          title,
          type,
          status: "nerezervisano" as const,
          posnoMenuAvailable,
        };
      }

      const isPosno = detail.isPosno ?? detail.items.isPosno ?? false;
      const effectiveStatus = resolveEffectiveReservationStatus(
        dateKey,
        type,
        detail.status,
        workingHours,
        getAppNow(),
      );

      return {
        title,
        type,
        status: effectiveStatus,
        items: detail.items,
        muted: detail.muted,
        isPosno,
        posnoMenuAvailable: posnoMenuAvailable || isPosno,
        pickupMode: detail.pickupMode,
      };
    });

  return {
    dateLabel: formatCalendarDateLabel(dateKey),
    sections,
    isReservationAvailable: isDayAvailableForReservation(dateKey),
  };
}

export function canCancelMealReservation(dateKey: string, mealType: MealType) {
  const detail = mealDetailsByDateKey[dateKey]?.[mealType];
  if (detail?.status !== "zakazano") {
    return false;
  }

  return canCancelMealSlot(dateKey, mealType);
}

export function getMealReservationRefundRsd(dateKey: string, mealType: MealType): number {
  const detail = mealDetailsByDateKey[dateKey]?.[mealType];
  if (!detail || detail.status !== "zakazano") {
    return 0;
  }

  return detail.totalRsd ?? 0;
}

export type CancelMealReservationResult =
  | { success: false }
  | { success: true; refundRsd: number; cardId?: string };

export function cancelMealReservation(
  dateKey: string,
  mealType: MealType,
): CancelMealReservationResult {
  if (!canCancelMealReservation(dateKey, mealType)) {
    return { success: false };
  }

  const detail = mealDetailsByDateKey[dateKey]?.[mealType];
  const refundRsd = detail?.totalRsd ?? 0;
  const cardId = detail?.cardId;

  const meals = reservationsByDateKey[dateKey];
  if (!meals) {
    return { success: false };
  }

  reservationsByDateKey[dateKey] = meals.filter((type) => type !== mealType);
  if (reservationsByDateKey[dateKey].length === 0) {
    delete reservationsByDateKey[dateKey];
  }

  const dayDetails = mealDetailsByDateKey[dateKey];
  if (dayDetails) {
    delete dayDetails[mealType];
    if (Object.keys(dayDetails).length === 0) {
      delete mealDetailsByDateKey[dateKey];
    }
  }

  return { success: true, refundRsd, cardId };
}

export function createMealReservation(
  dateKey: string,
  mealType: MealType,
  items: MealDetailsRow,
  options?: {
    pickupMode?: MealPickupMode;
    isPosno?: boolean;
    totalRsd?: number;
    cardId?: string;
  },
) {
  if (!isDayAvailableForReservation(dateKey)) {
    return false;
  }

  const existingMeals = reservationsByDateKey[dateKey] ?? [];
  if (existingMeals.includes(mealType)) {
    return false;
  }

  reservationsByDateKey[dateKey] = sortMealTypes([...existingMeals, mealType]);

  const isPosno = options?.isPosno ?? items.isPosno ?? false;
  const status = resolveEffectiveReservationStatus(
    dateKey,
    mealType,
    "zakazano",
    getWorkingHoursFromAdminStore(),
    getAppNow(),
  );

  mealDetailsByDateKey[dateKey] = {
    ...(mealDetailsByDateKey[dateKey] ?? {}),
    [mealType]: {
      status,
      items,
      isPosno,
      pickupMode: options?.pickupMode,
      totalRsd: options?.totalRsd,
      cardId: options?.cardId,
    },
  };

  return true;
}

export function getSuggestedObrokForDay(dateKey: string): MealType {
  const { sections } = getMealDetailsForDay(dateKey);
  const unreserved = sections.find((section) => section.status === "nerezervisano");
  return unreserved?.type ?? "lunch";
}

export function getPrimaryMealTabForDay(dateKey: string): MealType {
  return getTodayPrimaryMealSection(dateKey).section.type;
}

export type NextUnreservedMealSlot = {
  dateKey: string;
  mealType: MealType;
  dateLabel: string;
  mealLabel: string;
};

export function getNextUnreservedMealSlot(): NextUnreservedMealSlot | null {
  const startDate = parseDateKey(getBookingTodayDateKey()) ?? calendarTodayDate;

  for (let offset = 0; offset < getReservationAdvanceDays(); offset += 1) {
    const date = addDays(startDate, offset);
    const dateKey = toDateKey(date);
    const { sections } = getMealDetailsForDay(dateKey);
    const unreserved = sections.find((section) =>
      canBookMealSlot(dateKey, section.type, section.status),
    );

    if (unreserved) {
      return {
        dateKey,
        mealType: unreserved.type,
        dateLabel: formatCalendarDateLabel(dateKey),
        mealLabel: unreserved.title.toLowerCase(),
      };
    }
  }

  return null;
}

export type PrimaryMealHeroType = "active" | "scheduled" | "unreserved" | "done";

export type TodayPrimaryMealSection = {
  section: MealDetailsSection;
  dateLabel: string;
  dateKey: string;
  isReservationAvailable: boolean;
  heroType: PrimaryMealHeroType;
};

export function resolvePrimaryMealSection(
  dateKey: string,
  sections: MealDetailsSection[],
  dateLabel: string,
  isReservationAvailable: boolean,
  now: Date = getAppNow(),
): TodayPrimaryMealSection {
  const isToday = dateKey === getAppDateKey(now);
  const workingHours = isToday ? getWorkingHoursFromAdminStore() : null;
  const focusType = isToday && workingHours
    ? getTodayFocusMealType(dateKey, workingHours, now)
    : null;

  const active = sections.find((section) => section.status === "aktivno");
  if (active && (!focusType || active.type === focusType)) {
    return {
      section: active,
      dateLabel,
      dateKey,
      isReservationAvailable,
      heroType: "active",
    };
  }

  if (isToday && workingHours && focusType) {
    const focusSection = sections.find((section) => section.type === focusType);

    if (focusSection) {
      const inPickupWindow = isWithinPickupWindow(dateKey, focusType, workingHours, now);

      if (inPickupWindow && focusSection.status === "zakazano") {
        return {
          section: { ...focusSection, status: "aktivno" },
          dateLabel,
          dateKey,
          isReservationAvailable,
          heroType: "active",
        };
      }

      if (focusSection.status === "aktivno") {
        return {
          section: focusSection,
          dateLabel,
          dateKey,
          isReservationAvailable,
          heroType: "active",
        };
      }

      if (focusSection.status === "zakazano") {
        return {
          section: focusSection,
          dateLabel,
          dateKey,
          isReservationAvailable,
          heroType: "scheduled",
        };
      }

      if (focusSection.status === "nerezervisano") {
        return {
          section: focusSection,
          dateLabel,
          dateKey,
          isReservationAvailable,
          heroType: "unreserved",
        };
      }

      if (focusSection.status === "iskorisceno" || focusSection.status === "propusteno") {
        return {
          section: focusSection,
          dateLabel,
          dateKey,
          isReservationAvailable,
          heroType: "done",
        };
      }
    }
  }

  const scheduled = sections.find((section) => section.status === "zakazano");
  if (scheduled) {
    return {
      section: scheduled,
      dateLabel,
      dateKey,
      isReservationAvailable,
      heroType: "scheduled",
    };
  }

  const bookableType = getFirstBookableMealType(dateKey, sections);
  if (bookableType) {
    const section = sections.find((entry) => entry.type === bookableType) ?? sections[0];
    return {
      section,
      dateLabel,
      dateKey,
      isReservationAvailable,
      heroType: "unreserved",
    };
  }

  const unreserved = sections.find((section) => section.status === "nerezervisano");
  if (unreserved) {
    return {
      section: unreserved,
      dateLabel,
      dateKey,
      isReservationAvailable,
      heroType: "unreserved",
    };
  }

  const fallback = sections.find((section) => section.status !== "nerezervisano") ?? sections[0];

  return {
    section: fallback,
    dateLabel,
    dateKey,
    isReservationAvailable,
    heroType: "done",
  };
}

export function getTodayPrimaryMealSection(dateKey: string, now: Date = getAppNow()) {
  const { sections, dateLabel, isReservationAvailable } = getMealDetailsForDay(dateKey);
  return resolvePrimaryMealSection(dateKey, sections, dateLabel, isReservationAvailable, now);
}

export function getTimeGreeting() {
  const hour = getAppNow().getHours();

  if (hour < 12) {
    return "Dobro jutro";
  }

  if (hour < 18) {
    return "Dobar dan";
  }

  return "Dobro veče";
}

export const mealDetailsSections = getMealDetailsForDay(calendarTodayDateKey).sections;

export const mealLegend = [
  { label: "Doručak", type: "breakfast" as MealType },
  { label: "Ručak", type: "lunch" as MealType },
  { label: "Večera", type: "dinner" as MealType },
];

export function getPosnoMenuPreview(mealType: MealType) {
  return POSNO_MENU_PREVIEW[mealType];
}

export function dayHasPosnoMenu(dateKey: string) {
  return Object.values(POSNO_MENU_AVAILABILITY[dateKey] ?? {}).some(Boolean);
}

export function getPosnoSectionsForDay(dateKey: string) {
  return getMealDetailsForDay(dateKey).sections.filter(
    (section) => section.isPosno || section.posnoMenuAvailable,
  );
}

export function mealDotClass(type: MealType) {
  switch (type) {
    case "breakfast":
      return "meal-dot-breakfast";
    case "lunch":
      return "meal-dot-lunch";
    case "dinner":
      return "meal-dot-dinner";
  }
}

export type KitchenReservationExport = {
  id: string;
  dateKey: string;
  mealType: MealType;
  studentName: string;
  status: MealReservationStatus;
  items: MealDetailsRow;
  pickupMode?: MealPickupMode;
};

export type StudentMealReservationSnapshot = {
  dateKey: string;
  mealType: MealType;
  status: Exclude<MealReservationStatus, "nerezervisano">;
  items: MealDetailsRow;
  pickupMode?: MealPickupMode;
  totalRsd?: number;
};

export function getAllStudentMealReservations(): StudentMealReservationSnapshot[] {
  const results: StudentMealReservationSnapshot[] = [];

  for (const [dateKey, dayDetails] of Object.entries(mealDetailsByDateKey)) {
    for (const mealType of sortMealTypes(Object.keys(dayDetails) as MealType[])) {
      const detail = dayDetails[mealType];
      if (!detail?.items) {
        continue;
      }

      results.push({
        dateKey,
        mealType,
        status: detail.status,
        items: detail.items,
        pickupMode: detail.pickupMode,
        totalRsd: detail.totalRsd,
      });
    }
  }

  return results;
}

export function getAllMealReservationsForKitchen(): KitchenReservationExport[] {
  const results: KitchenReservationExport[] = [];

  for (const [dateKey, dayDetails] of Object.entries(mealDetailsByDateKey)) {
    for (const mealType of Object.keys(dayDetails) as MealType[]) {
      const detail = dayDetails[mealType];
      if (!detail?.items) {
        continue;
      }

      if (detail.status !== "zakazano" && detail.status !== "aktivno") {
        continue;
      }

      results.push({
        id: `live-${dateKey}-${mealType}`,
        dateKey,
        mealType,
        studentName: studentProfile.name,
        status: detail.status,
        items: detail.items,
        pickupMode: detail.pickupMode,
      });
    }
  }

  return results;
}
