import { addDays, compareDateKeys, formatCalendarDateLabel, parseDateKey, toDateKey } from "@/lib/calendar-utils";
import { getReservationAdvanceDays, getWorkingHours } from "@/lib/admin-system-store";
import { getAppNow } from "@/lib/date-utils";
import { isPickupWindowEnded } from "@/lib/meal-pickup-window";
import type { WorkingHoursRow } from "@/lib/meal-types";
import {
  calendarTodayDate,
  formatCalendarDayLabel,
  getAllStudentMealReservations,
  getMealReservationRefundRsd,
  isDayAvailableForReservation,
  type MealDetailsRow,
  type MealDetailsSection,
  type MealPickupMode,
  type MealReservationStatus,
  type MealType,
  type NextUnreservedMealSlot,
} from "@/lib/dashboard-mock";
import { resolveEffectiveReservationStatus } from "@/lib/meal-reservation-status";
import { sortMealTypes } from "@/lib/meal-order";
import type { PickupOrder } from "@/lib/preuzimanje-mock";
import type { RecentOrder, RecentOrderStatus } from "@/lib/rezervacije-mock";
import type { ReservationRecord } from "@/server/repositories/reservations";
import { canBookMealSlot, canCancelMealSlot, getBookingTodayDateKey } from "@/lib/meal-booking-window";

const mealTitles: Record<MealType, string> = {
  breakfast: "Doručak",
  lunch: "Ručak",
  dinner: "Večera",
};

const mealOrder: MealType[] = ["breakfast", "lunch", "dinner"];

const mealTypeLabel: Record<MealType, string> = {
  breakfast: "Doručak",
  lunch: "Ručak",
  dinner: "Večera",
};

export function buildMealDetailsForDay(dateKey: string, reservations: ReservationRecord[]) {
  const dayReservations = reservations.filter((entry) => entry.dateKey === dateKey);

  const sections: MealDetailsSection[] = mealOrder.map((type) => {
    const title = mealTitles[type];
    const reservation = dayReservations.find((entry) => entry.mealType === type);

    if (!reservation) {
      return {
        title,
        type,
        status: "nerezervisano" as const,
        posnoMenuAvailable: false,
      };
    }

    const isPosno = reservation.items.isPosno ?? false;

    return {
      title,
      type,
      status: resolveEffectiveReservationStatus(
        dateKey,
        type,
        reservation.status,
        getWorkingHours(),
        getAppNow(),
      ),
      items: reservation.items,
      isPosno,
      posnoMenuAvailable: isPosno,
      pickupMode: reservation.pickupMode,
      muted: reservation.status === "iskorisceno" || reservation.status === "propusteno",
    };
  });

  return {
    dateLabel: formatCalendarDateLabel(dateKey),
    sections,
    isReservationAvailable: isDayAvailableForReservation(dateKey),
  };
}

export function canCancelApiReservation(
  dateKey: string,
  mealType: MealType,
  reservations: ReservationRecord[],
) {
  const reservation = reservations.find(
    (entry) => entry.dateKey === dateKey && entry.mealType === mealType,
  );

  if (reservation?.status !== "zakazano") {
    return false;
  }

  return canCancelMealSlot(dateKey, mealType);
}

export function findApiReservation(
  dateKey: string,
  mealType: MealType,
  reservations: ReservationRecord[],
) {
  return reservations.find(
    (entry) => entry.dateKey === dateKey && entry.mealType === mealType,
  );
}

export function formatRefundRsd(amount: number) {
  return amount.toLocaleString("sr-RS", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function getReservationRefundRsd(
  dateKey: string,
  mealType: MealType,
  apiReservations?: ReservationRecord[],
): number {
  if (apiReservations !== undefined) {
    const reservation = findApiReservation(dateKey, mealType, apiReservations);
    if (!reservation || reservation.status !== "zakazano") {
      return 0;
    }
    return reservation.totalRsd;
  }

  return getMealReservationRefundRsd(dateKey, mealType);
}

export function reservationToPickupOrder(
  reservation: ReservationRecord,
  context: {
    studentName: string;
    cardId: string;
    cardDisplayNumber: string;
  },
): PickupOrder {
  return {
    id: reservation.id,
    dateKey: reservation.dateKey,
    dateLabel: formatCalendarDayLabel(reservation.dateKey),
    mealType: reservation.mealType,
    mealLabel: mealTypeLabel[reservation.mealType],
    items: reservation.items,
    studentName: context.studentName,
    cardId: context.cardId,
    cardDisplayNumber: context.cardDisplayNumber,
    pickupCode: reservation.pickupCode,
    status:
      resolveEffectiveReservationStatus(
        reservation.dateKey,
        reservation.mealType,
        reservation.status,
        getWorkingHours(),
        getAppNow(),
      ) === "aktivno"
        ? "spremno"
        : "zakazano",
    pickupMode: reservation.pickupMode,
  };
}

function mapReservationStatusToRecent(status: ReservationRecord["status"]): RecentOrderStatus {
  if (status === "iskorisceno") {
    return "success";
  }
  if (status === "propusteno") {
    return "cancelled";
  }
  return "pending";
}

export function formatPurchasedMealSummary(items: MealDetailsRow) {
  const parts: string[] = [];

  if (items.glavnoJelo) {
    parts.push(`Glavno: ${items.glavnoJelo}`);
  }
  if (items.dodatak) {
    parts.push(`Dodatak: ${items.dodatak}`);
  }
  if (items.salata) {
    parts.push(`Salata: ${items.salata}`);
  }
  if (items.obrok) {
    parts.push(`Dezert: ${items.obrok}`);
  }

  return parts.join(" · ");
}

function compareRecentReservationOrder(
  a: { dateKey: string; mealType: MealType },
  b: { dateKey: string; mealType: MealType },
) {
  const byDate = b.dateKey.localeCompare(a.dateKey);
  if (byDate !== 0) {
    return byDate;
  }

  return mealOrder.indexOf(a.mealType) - mealOrder.indexOf(b.mealType);
}

function toRecentOrder(entry: {
  id: string;
  dateKey: string;
  mealType: MealType;
  items: MealDetailsRow;
  status: MealReservationStatus;
}): RecentOrder {
  return {
    id: entry.id,
    dateLabel: formatCalendarDayLabel(entry.dateKey),
    mealLabel: mealTypeLabel[entry.mealType],
    mealType: entry.mealType,
    summary: formatPurchasedMealSummary(entry.items),
    status: mapReservationStatusToRecent(entry.status),
  };
}

export function buildRecentOrdersFromReservations(
  reservations: ReservationRecord[],
): RecentOrder[] {
  return [...reservations]
    .filter((reservation) => reservation.status !== "nerezervisano")
    .sort(compareRecentReservationOrder)
    .map((reservation) =>
      toRecentOrder({
        id: reservation.id,
        dateKey: reservation.dateKey,
        mealType: reservation.mealType,
        items: reservation.items,
        status: reservation.status,
      }),
    );
}

export function buildRecentOrdersFromMock(): RecentOrder[] {
  return getAllStudentMealReservations()
    .sort(compareRecentReservationOrder)
    .map((reservation) =>
      toRecentOrder({
        id: `mock-${reservation.dateKey}-${reservation.mealType}`,
        dateKey: reservation.dateKey,
        mealType: reservation.mealType,
        items: reservation.items,
        status: reservation.status,
      }),
    );
}

export function getReservedMealTypesForDate(
  dateKey: string,
  reservations: ReservationRecord[],
): MealType[] {
  return sortMealTypes(
    reservations
      .filter(
        (entry) =>
          entry.dateKey === dateKey &&
          entry.status !== "propusteno" &&
          entry.status !== "iskorisceno",
      )
      .map((entry) => entry.mealType),
  );
}

export function getHistoryMealTypesForDate(
  dateKey: string,
  reservations: ReservationRecord[],
): MealType[] {
  return sortMealTypes(
    reservations
      .filter((entry) => entry.dateKey === dateKey)
      .map((entry) => entry.mealType),
  );
}

export function isUpcomingReservation(
  entry: { dateKey: string; mealType: MealType; status: MealReservationStatus },
  todayDateKey: string,
  workingHours: WorkingHoursRow[],
  now: Date = getAppNow(),
): boolean {
  if (entry.status !== "zakazano" && entry.status !== "aktivno") {
    return false;
  }

  if (compareDateKeys(entry.dateKey, todayDateKey) < 0) {
    return false;
  }

  if (compareDateKeys(entry.dateKey, todayDateKey) > 0) {
    return true;
  }

  return !isPickupWindowEnded(entry.dateKey, entry.mealType, workingHours, now);
}

export function countUpcomingReservationsByMealType(
  reservations: Array<{ dateKey: string; mealType: MealType; status: MealReservationStatus }>,
  mealType: MealType,
  todayDateKey: string,
  workingHours: WorkingHoursRow[] = getWorkingHours(),
  now: Date = getAppNow(),
): number {
  return reservations.filter(
    (entry) =>
      entry.mealType === mealType &&
      isUpcomingReservation(entry, todayDateKey, workingHours, now),
  ).length;
}

export function getDayReservationSummaryFromReservations(
  dateKey: string,
  reservations: ReservationRecord[],
) {
  const meals = getReservedMealTypesForDate(dateKey, reservations);

  return {
    reserved: meals.length,
    total: 3,
    meals,
  };
}

export function getNextUnreservedMealSlotFromReservations(
  reservations: ReservationRecord[],
  todayDateKey: string = getBookingTodayDateKey(),
): NextUnreservedMealSlot | null {
  const startDate = parseDateKey(todayDateKey) ?? calendarTodayDate;

  for (let offset = 0; offset < getReservationAdvanceDays(); offset += 1) {
    const date = addDays(startDate, offset);
    const dateKey = toDateKey(date);
    const { sections } = buildMealDetailsForDay(dateKey, reservations);
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

export type { MealPickupMode };
