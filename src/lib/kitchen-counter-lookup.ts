import { parseCardQrPayload } from "@/lib/card-qr";
import { apiGetData } from "@/lib/api/client";
import { isClientBackendEnabled } from "@/lib/backend-config";
import type { KitchenReservationRecord } from "@/lib/kuhinja-mock";
import { lookupKitchenReservation } from "@/lib/kuhinja-prep-mock";
import type { MealType } from "@/lib/meal-types";
import type { ReservationRecord } from "@/server/repositories/reservations";
import { loadEzetonRecords } from "@/lib/ezeton-store";
import type { ZetonStatus } from "@/lib/ezeton-mock";

export type KitchenCounterLookupResult =
  | { ok: true; reservation: KitchenReservationRecord }
  | { ok: false; error: string };

function attachLiveZetonStatus(reservation: KitchenReservationRecord, apiZetonStatus?: ZetonStatus): KitchenReservationRecord {
  if (apiZetonStatus) {
    return { ...reservation, zetonStatus: apiZetonStatus };
  }

  if (isClientBackendEnabled()) {
    return reservation;
  }

  const records = loadEzetonRecords();
  for (const r of records) {
    const nameMatch =
      reservation.studentName &&
      r.studentName.toLowerCase().includes(reservation.studentName.toLowerCase().replace(/\./g, "").split(" ")[0]);
    if (nameMatch) {
      return { ...reservation, zetonStatus: r.zeton.status };
    }
  }

  return reservation;
}

export function mapApiReservationToKitchen(
  reservation: ReservationRecord,
): KitchenReservationRecord {
  return {
    id: reservation.id,
    dateKey: reservation.dateKey,
    mealType: reservation.mealType,
    studentName: reservation.studentName ?? "Student",
    studentFullName: reservation.studentName,
    userType: reservation.userType ?? undefined,
    dateOfBirth: reservation.dateOfBirth ?? undefined,
    faculty: reservation.faculty ?? undefined,
    cardId: reservation.cardNumber ?? undefined,
    status: reservation.status,
    items: { ...reservation.items },
    pickupMode: reservation.pickupMode,
    pickupCode: reservation.pickupCode,
    bookingStatus: reservation.status === "iskorisceno" ? "uspesno" : "proknjizeno",
  };
}

export async function performKitchenCounterLookup(
  raw: string,
  dateKey: string,
  mealType: MealType,
): Promise<KitchenCounterLookupResult> {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Unesite pickup QR kod ili sadržaj studentske kartice." };
  }

  const normalized = trimmed.toUpperCase();
  const isPickupCode =
    normalized.startsWith("EMZ-") && !normalized.startsWith("EMZ-CARD-");

  if (isClientBackendEnabled() && isPickupCode) {
    try {
      const data = await apiGetData<{ reservation: ReservationRecord; zetonStatus?: ZetonStatus }>(
        `/api/reservations?pickupCode=${encodeURIComponent(trimmed)}`,
      );
      if (data.reservation.dateKey !== dateKey || data.reservation.mealType !== mealType) {
        return { ok: false, error: "Narudžbina nije za trenutni obrok danas." };
      }

      const kitchen = mapApiReservationToKitchen(data.reservation);
      return { ok: true, reservation: attachLiveZetonStatus(kitchen, data.zetonStatus) };
    } catch {
      // API failed (e.g. 503 in mock mode) — fall through to mock lookup
    }
  }

  const found = lookupKitchenReservation(trimmed, dateKey, mealType);
  if (!found) {
    return { ok: false, error: "Narudžbina nije pronađena za trenutni obrok danas." };
  }

  return { ok: true, reservation: attachLiveZetonStatus(found) };
}

const pickupCodePattern = /^EMZ-\d{8}-[BLD]-\d{6}$/i;
const cardIdPattern = /^EMZ-CARD-\d+$/i;

export function isCompleteLookupInput(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) {
    return false;
  }

  if (pickupCodePattern.test(trimmed)) {
    return true;
  }

  const cardFromQr = parseCardQrPayload(trimmed);
  if (cardFromQr && cardIdPattern.test(cardFromQr)) {
    return true;
  }

  return cardIdPattern.test(trimmed);
}
