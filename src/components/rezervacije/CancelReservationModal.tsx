"use client";

import { X, XCircle } from "lucide-react";
import { formatRefundRsd } from "@/lib/reservations-view";

type CancelReservationModalProps = {
  mealLabel: string;
  dateLabel: string;
  itemsSummary?: string;
  refundRsd: number;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function CancelReservationModal({
  mealLabel,
  dateLabel,
  itemsSummary,
  refundRsd,
  isSubmitting = false,
  onClose,
  onConfirm,
}: CancelReservationModalProps) {
  return (
    <div
      aria-labelledby="cancel-reservation-title"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="dialog"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-[24px] bg-white shadow-[0_24px_64px_rgba(0,0,0,0.22)]">
        <div className="bg-gradient-to-br from-red-500 via-red-500 to-red-400 px-5 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-white/20">
                <XCircle aria-hidden="true" size={22} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/75">
                  Potvrda otkazivanja
                </p>
                <h2 className="text-xl font-bold" id="cancel-reservation-title">
                  Otkaži rezervaciju?
                </h2>
              </div>
            </div>
            <button
              aria-label="Zatvori"
              className="rounded-xl p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-50"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div>
            <p className="text-sm font-bold text-black">
              {mealLabel} · {dateLabel}
            </p>
            {itemsSummary ? (
              <p className="mt-1 text-sm font-light leading-relaxed text-black/60">{itemsSummary}</p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-[#5055D2]/15 bg-[#5055D2]/5 px-4 py-3">
            <p className="text-sm leading-relaxed text-black/70">
              Novac se vraća na karticu. Na karticu će vam biti vraćeno{" "}
              <strong className="font-bold text-[#5055D2]">
                {formatRefundRsd(refundRsd)} RSD
              </strong>
              .
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-bold text-black/70 transition-colors hover:border-black/20 hover:bg-[#EFF1F4] disabled:opacity-50"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              Ne, zadrži
            </button>
            <button
              className="rounded-xl bg-red-500 px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting}
              onClick={onConfirm}
              type="button"
            >
              {isSubmitting ? "Otkazujem…" : "Da, otkaži"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CancelReservationModal;
