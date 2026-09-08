"use client";

import { KitchenReservationDetailCard } from "@/components/kuhinja/KitchenReservationDetailCard";
import type { KitchenReservationRecord } from "@/lib/kuhinja-mock";

type KitchenCounterReservationPanelProps = {
  reservation: KitchenReservationRecord;
  onNext: () => void;
};

export function KitchenCounterReservationPanel({
  reservation,
  onNext,
}: KitchenCounterReservationPanelProps) {
  return (
    <div className="space-y-3">
      {reservation.status === "iskorisceno" ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Ovaj obrok je već preuzet. Proverite da li student traži dupli obrok.
        </p>
      ) : null}

      <KitchenReservationDetailCard onNext={onNext} reservation={reservation} />
    </div>
  );
}

export default KitchenCounterReservationPanel;
