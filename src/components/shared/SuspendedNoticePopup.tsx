"use client";

import { Ban } from "lucide-react";

type SuspendedNoticePopupProps = {
  name: string;
  reason?: string;
  onBackToLogin: () => void;
};

export function SuspendedNoticePopup({ name, reason, onBackToLogin }: SuspendedNoticePopupProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/20 backdrop-blur-sm pt-[10vh] sm:items-center sm:pt-0 p-4">
      <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.12)]">
          <div className="relative px-6 pt-6 pb-4 bg-gradient-to-b from-red-50 to-white">
            <div className="flex items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                <Ban size={26} />
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <h2 className="text-base font-bold leading-tight text-red-800">
                  Nalog je suspendovan
                </h2>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 space-y-3">
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              Pozdrav, <span className="font-semibold">{name}</span>! Nažalost, vaš nalog je suspendovan, nećete moći da koristite funkcije naloga.
            </p>
            {reason && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-1">Razlog:</p>
                <p className="text-sm text-red-800">{reason}</p>
              </div>
            )}
          </div>
          <div className="flex border-t border-black/[0.06] px-6 py-3">
            <button
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#5055D2] px-5 py-2 text-sm font-bold text-white transition-all hover:bg-[#3e42b3] active:scale-[0.97] w-full justify-center"
              onClick={onBackToLogin}
              type="button"
            >
              Nazad na prijavu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
