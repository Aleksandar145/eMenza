import {
  calendarTodayDateKey,
  formatCalendarDayLabel,
  getMealDetailsForDay,
  isDayAvailableForReservation,
  type MealDetailsRow,
  type MealPickupMode,
  type MealReservationStatus,
  type MealType,
  studentProfile,
} from "@/lib/dashboard-mock";
import { getWorkingHours } from "@/lib/admin-system-store";
import { getAppNow } from "@/lib/date-utils";
import { resolveEffectiveReservationStatus } from "@/lib/meal-reservation-status";
import type { WorkingHoursRow } from "@/lib/meal-types";

export type PickupOrderStatus = "spremno" | "preuzeto" | "zakazano";

export type PickupOrder = {
  id: string;
  dateKey: string;
  dateLabel: string;
  mealType: MealType;
  mealLabel: string;
  items: MealDetailsRow;
  studentName: string;
  cardId: string;
  cardDisplayNumber: string;
  pickupCode: string;
  status: PickupOrderStatus;
  pickupMode?: MealPickupMode;
};

/** Interni ID kartice — koristi čitač na šalteru (admin lookup). */
export const userCardId = "EMZ-CARD-3456";

export const userCardDisplayNumber = "**** **** **** 3456";

const mealTypeShort: Record<MealType, string> = {
  breakfast: "B",
  lunch: "L",
  dinner: "D",
};

const mealTypeLabel: Record<MealType, string> = {
  breakfast: "Doručak",
  lunch: "Ručak",
  dinner: "Večera",
};

function buildPickupCode(dateKey: string, mealType: MealType, suffix: string) {
  const compactDate = dateKey.replace(/-/g, "");
  return `EMZ-${compactDate}-${mealTypeShort[mealType]}-${suffix}`;
}

/** Stabilni mock kodovi po datumu i obroku. */
const pickupCodeByKey: Record<string, string> = {
  "2026-03-03:lunch": "EMZ-20260303-L-847291",
};

function pickupKey(dateKey: string, mealType: MealType) {
  return `${dateKey}:${mealType}`;
}

function resolvePickupCode(dateKey: string, mealType: MealType) {
  const key = pickupKey(dateKey, mealType);
  if (pickupCodeByKey[key]) {
    return pickupCodeByKey[key];
  }

  const hash = (dateKey.length + mealType.charCodeAt(0) * 17) % 900000 + 100000;
  return buildPickupCode(dateKey, mealType, String(hash));
}

function buildPickupOrders(): PickupOrder[] {
  const orders: PickupOrder[] = [];
  const datesInWindow = [
    calendarTodayDateKey,
    "2026-03-04",
    "2026-03-05",
    "2026-03-06",
  ];

  for (const dateKey of datesInWindow) {
    if (!isDayAvailableForReservation(dateKey)) {
      continue;
    }

    const { sections } = getMealDetailsForDay(dateKey);

    for (const section of sections) {
      if (section.status !== "aktivno" || !section.items) {
        continue;
      }

      orders.push({
        id: `pickup-${dateKey}-${section.type}`,
        dateKey,
        dateLabel: formatCalendarDayLabel(dateKey),
        mealType: section.type,
        mealLabel: mealTypeLabel[section.type],
        items: section.items,
        studentName: studentProfile.name,
        cardId: userCardId,
        cardDisplayNumber: userCardDisplayNumber,
        pickupCode: resolvePickupCode(dateKey, section.type),
        status: "spremno",
        pickupMode: section.pickupMode,
      });
    }
  }

  return orders;
}

export function getPickupOrdersForUser(): PickupOrder[] {
  return buildPickupOrders().filter((order) => order.status === "spremno");
}

export function getPickupOrderForMeal(
  dateKey: string,
  mealType: MealType,
): PickupOrder | null {
  return (
    buildPickupOrders().find(
      (order) =>
        order.dateKey === dateKey &&
        order.mealType === mealType &&
        order.status === "spremno",
    ) ?? null
  );
}

export function getPickupOrderByCode(pickupCode: string): PickupOrder | null {
  const normalized = pickupCode.trim().toUpperCase();
  return (
    buildPickupOrders().find(
      (order) => order.pickupCode.toUpperCase() === normalized && order.status === "spremno",
    ) ?? null
  );
}

export function getPickupOrderByCardId(cardId: string): PickupOrder | null {
  const normalized = cardId.trim().toUpperCase();
  const ready = buildPickupOrders().filter(
    (order) => order.cardId.toUpperCase() === normalized && order.status === "spremno",
  );

  if (ready.length === 0) {
    return null;
  }

  return ready[0];
}

export function getPickupOrderByCardIdAndMeal(
  cardId: string,
  dateKey: string,
  mealType: MealType,
): PickupOrder | null {
  const normalized = cardId.trim().toUpperCase();
  return (
    buildPickupOrders().find(
      (order) =>
        order.cardId.toUpperCase() === normalized &&
        order.dateKey === dateKey &&
        order.mealType === mealType &&
        order.status === "spremno",
    ) ?? null
  );
}

export function formatPickupCode(code: string) {
  return code.toUpperCase();
}

export function getPreuzimanjeHref(params?: { dateKey?: string; obrok?: MealType }) {
  const search = new URLSearchParams();

  if (params?.dateKey) {
    search.set("datum", params.dateKey);
  }

  if (params?.obrok) {
    search.set("obrok", params.obrok);
  }

  const query = search.toString();
  return query ? `/preuzimanje?${query}` : "/preuzimanje";
}

export function isMealReadyForPickup(
  dateKey: string,
  mealType: MealType,
  storedStatus: MealReservationStatus,
  appNow: Date = getAppNow(),
  workingHours: WorkingHoursRow[] = getWorkingHours(),
) {
  return (
    resolveEffectiveReservationStatus(
      dateKey,
      mealType,
      storedStatus,
      workingHours,
      appNow,
    ) === "aktivno"
  );
}
