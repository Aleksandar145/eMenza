import type { ZetonStatus } from "@/lib/ezeton-mock";
import { calendarTodayDateKey } from "@/lib/dashboard-mock";
import {
  kitchenSlotLabels,
  kitchenSlotOrder,
  kitchenSlotToMealField,
  type KitchenBookingStatus,
  type KitchenMenuSlotId,
  type KitchenPickupChannel,
  type KitchenReservationRecord,
} from "@/lib/kuhinja-mock";

export type ParsedDish = {
  name: string;
  quantity: number;
};

export type ReservationSlotRow = {
  slotId: KitchenMenuSlotId;
  label: string;
  dishes: ParsedDish[];
};

export type KitchenZetonMeta = {
  label: "AKTIVAN" | "Nema" | "ISKORISCENO";
  tone: "success" | "muted" | "warning";
};

export type KitchenBookingMeta = {
  label: "Proknjiženo" | "Uspešno";
  tone: "info" | "success";
  className: string;
};

export type KitchenPickupChannelMeta = {
  label: string;
  icon: "card" | "qr";
};

export type SlotDisplayMode = "empty" | "single" | "same" | "mixed";

function parseDishSegment(part: string): ParsedDish {
  const trimmed = part.trim();
  if (!trimmed || trimmed === "—") {
    return { name: "", quantity: 0 };
  }

  const multiplyMatch = trimmed.match(/^(.+?)\s×\s*(\d+)$/);
  if (multiplyMatch) {
    return { name: multiplyMatch[1].trim(), quantity: Number(multiplyMatch[2]) };
  }

  return { name: trimmed, quantity: 1 };
}

export function parseSlotDishes(value: string): ParsedDish[] {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "—") {
    return [];
  }

  if (trimmed.includes(" + ")) {
    return trimmed
      .split(" + ")
      .map(parseDishSegment)
      .filter((dish) => dish.name.length > 0);
  }

  const dish = parseDishSegment(trimmed);
  return dish.name.length > 0 ? [dish] : [];
}

export function getSlotTotalPortions(dishes: ParsedDish[]): number {
  return dishes.reduce((sum, dish) => sum + dish.quantity, 0);
}

export function getSlotDisplayMode(dishes: ParsedDish[]): SlotDisplayMode {
  if (dishes.length === 0) {
    return "empty";
  }

  if (dishes.length === 1) {
    return dishes[0].quantity >= 2 ? "same" : "single";
  }

  const uniqueNames = new Set(dishes.map((dish) => dish.name));
  if (uniqueNames.size >= 2 || dishes.some((dish) => dish.quantity >= 2)) {
    return "mixed";
  }

  return "same";
}

export function getSlotPortionLabel(index: number): string {
  return `Porcija ${index + 1}`;
}

export function getReservationSlotRows(record: KitchenReservationRecord): ReservationSlotRow[] {
  return kitchenSlotOrder.map((slotId) => {
    const field = kitchenSlotToMealField[slotId];
    const rawValue = record.items[field];
    return {
      slotId,
      label: kitchenSlotLabels[slotId],
      dishes: parseSlotDishes(rawValue),
    };
  });
}

export function getKitchenZetonMeta(status: ZetonStatus | undefined): KitchenZetonMeta {
  if (status === "active") {
    return { label: "AKTIVAN", tone: "success" };
  }
  if (status === "used") {
    return { label: "ISKORISCENO", tone: "warning" };
  }
  return { label: "Nema", tone: "muted" };
}

const statusOrder: Record<KitchenReservationRecord["status"], number> = {
  aktivno: 0,
  zakazano: 1,
  iskorisceno: 2,
  propusteno: 3,
  nerezervisano: 4,
};

export function sortKitchenReservationsForDisplay(
  records: KitchenReservationRecord[],
): KitchenReservationRecord[] {
  return [...records].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
}

export function formatStudentDisplayName(record: KitchenReservationRecord): string {
  return record.studentFullName ?? record.studentName;
}

export function getBookingStatusMeta(
  status: KitchenBookingStatus | undefined,
  reservationStatus: KitchenReservationRecord["status"],
): KitchenBookingMeta {
  if (status === "uspesno" || reservationStatus === "iskorisceno") {
    return {
      label: "Uspešno",
      tone: "success",
      className: "bg-emerald-100 text-emerald-800",
    };
  }

  return {
    label: "Proknjiženo",
    tone: "info",
    className: "bg-sky-100 text-sky-800",
  };
}

export function getPickupChannelLabel(channel: KitchenPickupChannel): KitchenPickupChannelMeta {
  if (channel === "qr") {
    return { label: "Uzeto pomoću QR koda", icon: "qr" };
  }

  return { label: "Uzeto pomoću kartice", icon: "card" };
}

export function getCurrentKitchenReservation(
  records: KitchenReservationRecord[],
): KitchenReservationRecord | null {
  return sortKitchenReservationsForDisplay(records).find((record) => record.status === "aktivno") ?? null;
}

export function getKitchenOrderHistory(
  records: KitchenReservationRecord[],
): KitchenReservationRecord[] {
  return records
    .filter((record) => record.status === "iskorisceno")
    .sort((a, b) => {
      const aTime = a.pickedUpAt ? Date.parse(a.pickedUpAt) : 0;
      const bTime = b.pickedUpAt ? Date.parse(b.pickedUpAt) : 0;
      return bTime - aTime;
    });
}

export function getKitchenPendingPickups(
  records: KitchenReservationRecord[],
): KitchenReservationRecord[] {
  return sortKitchenReservationsForDisplay(records).filter(
    (record) => record.status === "aktivno" || record.status === "zakazano",
  );
}

export function formatPickedUpTime(iso: string | undefined): string | null {
  if (!iso) {
    return null;
  }

  const pickedUp = Date.parse(iso);
  const now = Date.parse(`${calendarTodayDateKey}T12:00:00.000Z`);
  const diffMinutes = Math.max(1, Math.round((now - pickedUp) / 60_000));

  if (diffMinutes < 60) {
    return `Pre ${diffMinutes} min`;
  }

  return new Intl.DateTimeFormat("sr-RS", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
