"use client";

import { Ticket, X } from "lucide-react";

type ZetonPurchaseModalProps = {
  depositRsd: number;
  mode?: "purchase" | "reactivate";
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

const modeConfig = {
  purchase: {
    title: "Aktivirajte novi žeton?",
    header: "Kupovina žetona",
    description: "Žeton će biti aktiviran nakon uplate kaucije koju je administrator odredio.",
    button: "Potvrdi i plati",
    submitting: "Plaćam…",
  },
  reactivate: {
    title: "Reaktivirajte žeton?",
    header: "Reaktivacija žetona",
    description: "Žeton će biti ponovo aktiviran nakon uplate kaucije.",
    button: "Plati reaktivaciju",
    submitting: "Plaćam…",
  },
};

export function ZetonPurchaseModal({
  depositRsd,
  mode = "purchase",
  isSubmitting = false,
  onClose,
  onConfirm,
}: ZetonPurchaseModalProps) {
  const config = modeConfig[mode];

  return (
    <div
      aria-labelledby="zeton-purchase-title"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="dialog"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-[24px] bg-white shadow-[0_24px_64px_rgba(0,0,0,0.22)]">
        <div className="bg-gradient-to-br from-[#5055D2] via-[#5055D2] to-[#6366e8] px-5 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-white/20">
                <Ticket aria-hidden="true" size={22} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/75">
                  {config.header}
                </p>
                <h2 className="text-xl font-bold" id="zeton-purchase-title">
                  {config.title}
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
          <p className="text-sm font-light leading-relaxed text-black/70">
            {config.description}
          </p>

          {depositRsd > 0 ? (
            <div className="rounded-2xl border border-[#5055D2]/15 bg-[#5055D2]/5 px-4 py-3">
              <p className="text-sm leading-relaxed text-black/70">
                Sa kartice će vam biti naplaćeno{" "}
                <strong className="font-bold text-[#5055D2]">
                  {depositRsd.toLocaleString("sr-RS")} RSD
                </strong>
                .
              </p>
            </div>
          ) : null}

          <p className="text-xs font-light leading-relaxed text-black/50">
            Kaucija se vraća na karticu po vraćanju pribora u restoranu.
          </p>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-bold text-black/70 transition-colors hover:border-black/20 hover:bg-[#EFF1F4] disabled:opacity-50"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              Otkaži
            </button>
            <button
              className="rounded-xl bg-[#5055D2] px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting}
              onClick={onConfirm}
              type="button"
            >
              {isSubmitting ? config.submitting : config.button}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ZetonPurchaseModal;
