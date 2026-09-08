"use client";

import { ArrowRight, CornerDownLeft, CreditCard, QrCode, Ticket } from "lucide-react";
import { KitchenSlotDishesDisplay } from "@/components/kuhinja/KitchenSlotDishesDisplay";
import { PosnoBadge } from "@/components/shared/PosnoBadge";
import { PonetiBadge } from "@/components/shared/PonetiBadge";
import { StaffCard, staffButtonPrimaryClass } from "@/components/staff";
import {
  formatStudentDisplayName,
  getBookingStatusMeta,
  getKitchenZetonMeta,
  getPickupChannelLabel,
  getReservationSlotRows,
} from "@/lib/kuhinja-order-display";
import { markKitchenReservationPickedUp } from "@/lib/kuhinja-mock";
import type { KitchenReservationRecord } from "@/lib/kuhinja-mock";

type KitchenReservationDetailCardProps = {
  reservation: KitchenReservationRecord;
  onNext?: () => void;
};

const statusStyles = {
  aktivno: { label: "Aktivno", className: "bg-emerald-100 text-emerald-800" },
  zakazano: { label: "Zakazano", className: "bg-sky-100 text-sky-800" },
};

const zetonToneStyles = {
  success: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  muted: "bg-black/[0.06] text-black/55 ring-black/10",
  warning: "bg-amber-100 text-amber-800 ring-amber-200",
};

const zetonDotStyles = {
  success: "bg-emerald-500",
  muted: "bg-black/30",
  warning: "bg-amber-500",
};

export function KitchenReservationDetailCard({
  reservation,
  onNext,
}: KitchenReservationDetailCardProps) {

  const handleConfirmPickup = async () => {
    try {
      await fetch(`/api/reservations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickupCode: reservation.pickupCode }),
      });
    } catch {}
    if (reservation.pickupCode) {
      markKitchenReservationPickedUp(reservation.pickupCode);
    }
    if (onNext) onNext();
  };

  const displayName = formatStudentDisplayName(reservation);
  const booking = getBookingStatusMeta(reservation.bookingStatus, reservation.status);
  const pickupChannel = reservation.pickupChannel ? getPickupChannelLabel(reservation.pickupChannel) : null;
  const zeton = getKitchenZetonMeta(reservation.zetonStatus);
  const statusMeta = (reservation.status === "aktivno" || reservation.status === "zakazano") ? statusStyles[reservation.status] : null;
  const slots = getReservationSlotRows(reservation);
  const mainSlot = slots.find((slot) => slot.slotId === "main");
  const otherSlots = slots.filter((slot) => slot.slotId !== "main");

  return (
    <StaffCard className="overflow-hidden p-0">
      <div className="border-b border-black/5 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-lg font-bold text-black">{displayName}</h3>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${booking.className}`}>
                  {booking.label}
                </span>
                {onNext && (
                  <button
                    onClick={handleConfirmPickup}
                    className={`${staffButtonPrimaryClass} inline-flex items-center gap-2 px-3 py-2 text-sm`}
                    title="Prečica: Enter"
                  >
                    <span>Sledeći</span>
                    <ArrowRight size={16} />
                    <span className="inline-flex h-6 items-center rounded-lg border border-white/20 bg-white/10 px-2">
                      <CornerDownLeft size={12} />
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* SEKCIJA ZA TIP KORISNIKA, GODIŠTE I FAKULTET */}
            {(reservation.userType || reservation.dateOfBirth || reservation.faculty) && (
              <p className="mt-1.5 text-sm text-black/55">
                {reservation.userType && (
                  <span>{reservation.userType === "ucenik" ? "Učenik" : "Student"}</span>
                )}
                {reservation.userType && reservation.dateOfBirth && <span className="mx-1.5 text-black/30">·</span>}
                {reservation.dateOfBirth && <span>Rođen/a: {reservation.dateOfBirth}</span>}
                {(reservation.userType || reservation.dateOfBirth) && reservation.faculty && <span className="mx-1.5 text-black/30">·</span>}
                {reservation.faculty && <span>{reservation.faculty}</span>}
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {statusMeta && <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusMeta.className}`}>{statusMeta.label}</span>}
              {reservation.items.isPosno && <PosnoBadge />}
              {reservation.pickupMode === "poneti" && <PonetiBadge />}
            </div>
          </div>
        </div>

        {pickupChannel && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-3 py-1.5 text-xs font-semibold text-black/70">
            {pickupChannel.icon === "qr" ? <QrCode size={14} /> : <CreditCard size={14} />}
            {pickupChannel.label}
          </p>
        )}

        <div className="mt-3 flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-black/45">
            <Ticket size={14} /> eZeton
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${zetonToneStyles[zeton.tone]}`}>
            <span className={`size-1.5 rounded-full ${zetonDotStyles[zeton.tone]}`} />
            {zeton.label}
          </span>
        </div>
      </div>

      <div className="space-y-3 p-5">
        {mainSlot && <KitchenSlotDishesDisplay dishes={mainSlot.dishes} prominent showLabel slotId={mainSlot.slotId} />}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {otherSlots.map((slot) => (
            <KitchenSlotDishesDisplay key={slot.slotId} dishes={slot.dishes} showLabel slotId={slot.slotId} />
          ))}
        </div>
      </div>
    </StaffCard>
  );
}