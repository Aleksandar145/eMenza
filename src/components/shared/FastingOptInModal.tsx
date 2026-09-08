"use client";

import { Leaf, X } from "lucide-react";
import type { FastingOptInPrompt } from "@/lib/fasting-preferences";

type FastingOptInModalProps = {
  prompt: FastingOptInPrompt;
  onPostim: () => void;
  onNePostim: () => void;
  onPreskoci: () => void;
};

export function FastingOptInModal({
  prompt,
  onPostim,
  onNePostim,
  onPreskoci,
}: FastingOptInModalProps) {
  const accentClass =
    prompt.period === "ramazan"
      ? "from-[#5055D2] via-[#5a5fd8] to-[#9093E1]"
      : "from-[#b45309] via-[#c46210] to-[#d97706]";

  return (
    <div
      aria-labelledby="fasting-opt-in-title"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="dialog"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-[24px] bg-white shadow-[0_24px_64px_rgba(0,0,0,0.22)]">
        <div className={`bg-gradient-to-br ${accentClass} px-5 py-5 text-white`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-white/20">
                <Leaf aria-hidden="true" size={22} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/75">
                  Obaveštenje · {prompt.startLabel}
                </p>
                <h2 className="text-xl font-bold" id="fasting-opt-in-title">
                  {prompt.title}
                </h2>
              </div>
            </div>
            <button
              aria-label="Zatvori"
              className="rounded-xl p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
              onClick={onPreskoci}
              type="button"
            >
              <X aria-hidden="true" size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5">
          <p className="text-sm leading-relaxed text-black/70 lg:text-[15px]">{prompt.message}</p>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              className="rounded-xl bg-[#2f8f55] px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
              onClick={onPostim}
              type="button"
            >
              Postim
            </button>
            <button
              className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-bold text-black/70 transition-colors hover:border-black/20 hover:bg-[#EFF1F4]"
              onClick={onNePostim}
              type="button"
            >
              Ne postim
            </button>
          </div>

          <button
            className="w-full text-center text-sm font-semibold text-black/45 transition-colors hover:text-[#5055D2]"
            onClick={onPreskoci}
            type="button"
          >
            Preskoči sada
          </button>
        </div>
      </div>
    </div>
  );
}

export default FastingOptInModal;
