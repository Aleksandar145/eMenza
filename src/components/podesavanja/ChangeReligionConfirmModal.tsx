"use client";

import { useCallback, useEffect } from "react";
import { HelpCircle, X } from "lucide-react";
import { getReligionLabel, type UserReligion } from "@/lib/user-preferences";

type ChangeReligionConfirmModalProps = {
  currentReligion: UserReligion;
  nextReligion: UserReligion;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ChangeReligionConfirmModal({
  currentReligion,
  nextReligion,
  onConfirm,
  onCancel,
}: ChangeReligionConfirmModalProps) {
  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    },
    [onCancel],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [handleEscape]);

  return (
    <div
      aria-labelledby="change-religion-title"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="dialog"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-[24px] bg-white shadow-[0_24px_64px_rgba(0,0,0,0.22)]">
        <div className="bg-gradient-to-br from-[#5055D2] via-[#5a5fd8] to-[#9093E1] px-5 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-white/20">
                <HelpCircle aria-hidden="true" size={22} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/75">
                  Potvrda promene
                </p>
                <h2 className="text-xl font-bold" id="change-religion-title">
                  Promena veroispovesti?
                </h2>
              </div>
            </div>
            <button
              aria-label="Zatvori"
              className="rounded-xl p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
              onClick={onCancel}
              type="button"
            >
              <X aria-hidden="true" size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5">
          <p className="text-sm leading-relaxed text-black/70">
            Da li ste sigurni da želite da promenite veroispovest?
          </p>

          <div className="rounded-2xl border border-[#5055D2]/15 bg-[#5055D2]/5 px-4 py-3">
            <p className="text-sm leading-relaxed text-black/70">
              <span className="font-semibold text-black">{getReligionLabel(currentReligion)}</span>
              {" → "}
              <span className="font-semibold text-[#5055D2]">{getReligionLabel(nextReligion)}</span>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-black/60">
              Ova promena utiče na personalizovana obaveštenja o postu i posnom meniju.
              Nakon potvrde kliknite <strong className="font-semibold text-black">Sačuvaj</strong> da
              primenite izbor.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-bold text-black/70 transition-colors hover:border-black/20 hover:bg-[#EFF1F4]"
              onClick={onCancel}
              type="button"
            >
              Otkaži
            </button>
            <button
              className="rounded-xl bg-[#5055D2] px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
              onClick={onConfirm}
              type="button"
            >
              Potvrdi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChangeReligionConfirmModal;
