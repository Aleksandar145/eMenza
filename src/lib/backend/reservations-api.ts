import type { MealDetailsRow, MealPickupMode } from "@/lib/dashboard-mock";
import type { MealType } from "@/lib/meal-types";
import type { ReservationDishIds, ReservationRecord } from "@/server/repositories/reservations";
import { apiGetData, apiPatch, apiPost, apiDelete } from "@/lib/api/client";
import { isClientBackendEnabled } from "@/lib/backend-config";

export function shouldUseReservationsApi() {
  return isClientBackendEnabled();
}

let inFlightReservations: Promise<ReservationRecord[]> | null = null;

export async function fetchMyReservationsFromApi() {
  if (inFlightReservations) {
    return inFlightReservations;
  }

  inFlightReservations = apiGetData<{ reservations: ReservationRecord[] }>("/api/reservations")
    .then((data) => data.reservations)
    .finally(() => {
      inFlightReservations = null;
    });

  return inFlightReservations;
}

export async function createReservationViaApi(input: {
  dateKey: string;
  mealType: MealType;
  items: MealDetailsRow;
  dishIds?: ReservationDishIds;
  pickupMode?: MealPickupMode;
  isPosno?: boolean;
  totalRsd: number;
}) {
  const data = await apiPost<{ reservation: ReservationRecord }>("/api/reservations", input);
  return data.reservation;
}

export async function lookupPickupViaApi(pickupCode: string) {
  const data = await apiGetData<{ reservation: ReservationRecord }>(
    `/api/reservations?pickupCode=${encodeURIComponent(pickupCode)}`,
  );
  return data.reservation;
}

export async function markPickupViaApi(pickupCode: string) {
  return apiPatch<{ reservation: ReservationRecord }>("/api/reservations", { pickupCode });
}

export async function cancelReservationViaApi(reservationId: string) {
  return apiDelete<{ reservation: ReservationRecord }>(
    `/api/reservations?id=${encodeURIComponent(reservationId)}`,
  );
}

export async function fetchKitchenReservationsFromApi(dateKey: string, mealType: MealType) {
  const data = await apiGetData<{ reservations: ReservationRecord[] }>(
    `/api/reservations?kitchen=1&dateKey=${dateKey}&mealType=${mealType}`,
  );
  return data.reservations;
}
