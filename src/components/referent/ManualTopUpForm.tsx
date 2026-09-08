"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { useReferentSession } from "@/hooks/useReferentSession";
import { useToast } from "@/components/shared/toast/useToast";
import { manualTopUp } from "@/lib/referent-cards-store";
import {
  HIGH_TOP_UP_THRESHOLD,
  MAX_TOP_UP,
  MIN_TOP_UP,
} from "@/lib/top-up-limits";

type ManualTopUpFormProps = {
  cardId: string;
  onSuccess?: () => void;
};

const QUICK_AMOUNTS = [200, 500, 1000, 2000] as const;

function parseAmount(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function ManualTopUpForm({ cardId, onSuccess }: ManualTopUpFormProps) {
  const { session } = useReferentSession();
  const toast = useToast();
  const [amount, setAmount] = useState("500");
  const [note, setNote] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showHighConfirm, setShowHighConfirm] = useState(false);
  const [highAmountConfirmed, setHighAmountConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function pickQuickAmount(value: number) {
    setAmount(String(value));
    setErrMsg("");
  }

  function handleAmountChange(value: string) {
    setAmount(value);
    setErrMsg("");
  }

  function validateAmount(parsed: number | null): string | null {
    if (parsed === null) return "Unesite ispravan iznos.";
    if (parsed < MIN_TOP_UP) return `Minimalan iznos dopune je ${MIN_TOP_UP} RSD.`;
    if (parsed > MAX_TOP_UP) return `Maksimalan iznos dopune je ${MAX_TOP_UP} RSD.`;
    return null;
  }

  function handleSubmitClick(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const parsed = parseAmount(amount);
    const error = validateAmount(parsed);
    if (error) {
      setErrMsg(error);
      return;
    }
    if (parsed! > HIGH_TOP_UP_THRESHOLD) {
      setHighAmountConfirmed(false);
      setShowConfirm(true);
      return;
    }
    setShowConfirm(true);
  }

  function handleConfirm() {
    if (!session) return;
    const parsed = parseAmount(amount);
    if (validateAmount(parsed)) return;

    if (parsed! > HIGH_TOP_UP_THRESHOLD && !highAmountConfirmed) {
      setShowConfirm(false);
      setHighAmountConfirmed(false);
      setShowHighConfirm(true);
      return;
    }

    setHighAmountConfirmed(false);
    setShowHighConfirm(false);
    void performTopUp(parsed!);
  }

  async function performTopUp(parsed: number) {
    if (!session) return;
    setIsSubmitting(true);
    try {
      await manualTopUp(cardId, parsed, session.displayName, note.trim() || undefined);
      setNote("");
      setShowConfirm(false);
      setShowHighConfirm(false);
      setHighAmountConfirmed(false);
      toast.success(`Uplaćeno ${parsed.toLocaleString("sr-RS")} RSD na karticu.`);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Dopuna nije uspela.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <form className="space-y-3 rounded-2xl border border-[#5055D2]/15 bg-[#5055D2]/5 p-4" onSubmit={handleSubmitClick}>
        <h3 className="text-sm font-bold text-[#5055D2]">Ručna dopuna (gotovina)</h3>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-black/45" htmlFor="topup-amount">
            Iznos (RSD)
          </label>
          <input
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm"
            id="topup-amount"
            max={String(MAX_TOP_UP)}
            min={String(MIN_TOP_UP)}
            onChange={(event) => handleAmountChange(event.target.value)}
            required
            step="1"
            type="number"
            value={amount}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((value) => {
              const active = Number(amount.replace(",", ".")) === value;
              return (
                <button
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 ${
                    active
                      ? "bg-[#5055D2] text-white"
                      : "border border-[#5055D2]/25 bg-white text-[#5055D2] hover:bg-[#5055D2]/10"
                  }`}
                  key={value}
                  onClick={() => pickQuickAmount(value)}
                  type="button"
                >
                  {value.toLocaleString("sr-RS")}
                </button>
              );
            })}
          </div>
          {errMsg ? (
            <p className="mt-2 text-xs font-semibold text-red-600">{errMsg}</p>
          ) : null}
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-black/45" htmlFor="topup-note">
            Napomena
          </label>
          <input
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm"
            id="topup-note"
            onChange={(event) => setNote(event.target.value)}
            placeholder="npr. Gotovina na šalteru"
            type="text"
            value={note}
          />
        </div>
        <button
          className="w-full rounded-full bg-[#5055D2] py-2.5 text-sm font-semibold text-white"
          type="submit"
        >
          Knjiži dopunu
        </button>
      </form>

      {showConfirm ? (
        <div
          aria-labelledby="topup-confirm-title"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-4 sm:items-center"
          role="dialog"
        >
          <div className="w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-[0_24px_64px_rgba(0,0,0,0.22)]">
            <div className="bg-gradient-to-br from-[#5055D2] via-[#5055D2] to-[#6366e8] px-5 py-5 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/75">
                    Potvrda dopune
                  </p>
                  <h2 className="text-xl font-bold" id="topup-confirm-title">
                    Knjiži {Number(amount.replace(",", ".")).toLocaleString("sr-RS")} RSD?
                  </h2>
                </div>
                <button
                  aria-label="Zatvori"
                  className="rounded-xl p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-50"
                  disabled={isSubmitting}
                  onClick={() => setShowConfirm(false)}
                  type="button"
                >
                  <X aria-hidden="true" size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-5 px-5 py-5">
              <p className="text-sm font-light leading-relaxed text-black/70">
                Potvrdite unos gotovinske uplate na karticu.
              </p>

              {note.trim() ? (
                <div className="rounded-2xl border border-black/10 bg-[#EFF1F4]/50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-black/45">Napomena</p>
                  <p className="mt-1 text-sm text-black/70">{note.trim()}</p>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-bold text-black/70 transition-colors hover:border-black/20 hover:bg-[#EFF1F4] disabled:opacity-50"
                  disabled={isSubmitting}
                  onClick={() => setShowConfirm(false)}
                  type="button"
                >
                  Otkaži
                </button>
                <button
                  className="rounded-xl bg-[#5055D2] px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSubmitting}
                  onClick={() => void handleConfirm()}
                  type="button"
                >
                  {isSubmitting ? "Uplaćujem…" : "Potvrdi uplatu"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showHighConfirm ? (
        <div
          aria-labelledby="topup-high-confirm-title"
          aria-modal="true"
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/45 p-4 sm:items-center"
          role="dialog"
        >
          <div className="w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-[0_24px_64px_rgba(0,0,0,0.22)]">
            <div className="bg-gradient-to-br from-[#B45309] via-[#C2610A] to-[#E07B1F] px-5 py-5 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/75">
                    Velika dopuna
                  </p>
                  <h2 className="text-xl font-bold" id="topup-high-confirm-title">
                    Knjiži {Number(amount.replace(",", ".")).toLocaleString("sr-RS")} RSD?
                  </h2>
                </div>
                <button
                  aria-label="Zatvori"
                  className="rounded-xl p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-50"
                  disabled={isSubmitting}
                  onClick={() => {
                    setShowHighConfirm(false);
                    setHighAmountConfirmed(false);
                  }}
                  type="button"
                >
                  <X aria-hidden="true" size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-5 px-5 py-5">
              <p className="text-sm font-light leading-relaxed text-black/70">
                Iznos dopune je veći od {HIGH_TOP_UP_THRESHOLD.toLocaleString("sr-RS")} RSD.
                Potvrdite da ste proverili i da je iznos ispravan pre knjiženja.
              </p>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-300/60 bg-amber-50/60 px-4 py-3">
                <input
                  checked={highAmountConfirmed}
                  className="mt-0.5 size-4 shrink-0 accent-[#B45309]"
                  onChange={(event) => setHighAmountConfirmed(event.target.checked)}
                  type="checkbox"
                />
                <span className="text-sm font-medium text-black/75">
                  Potvrđujem da je iznos tačan i da sam ga ručno proverio/la.
                </span>
              </label>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-bold text-black/70 transition-colors hover:border-black/20 hover:bg-[#EFF1F4] disabled:opacity-50"
                  disabled={isSubmitting}
                  onClick={() => {
                    setShowHighConfirm(false);
                    setHighAmountConfirmed(false);
                  }}
                  type="button"
                >
                  Otkaži
                </button>
                <button
                  className="rounded-xl bg-[#B45309] px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={isSubmitting || !highAmountConfirmed}
                  onClick={() => void handleConfirm()}
                  type="button"
                >
                  {isSubmitting ? "Uplaćujem…" : "Potvrdi veliku dopunu"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default ManualTopUpForm;
