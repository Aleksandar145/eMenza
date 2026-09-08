"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { staffInputClass } from "@/components/staff";

type BlockDishDialogProps = {
  open: boolean;
  dishName: string;
  dateLabel: string;
  mealLabel: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
};

export function BlockDishDialog({
  open,
  dishName,
  dateLabel,
  mealLabel,
  onConfirm,
  onCancel,
}: BlockDishDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
      cancelRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
            <AlertTriangle className="text-red-600" size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[var(--text-primary)]">Blokirati jelo?</p>
            <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
              Jelo <span className="font-semibold text-[var(--text-primary)]">{dishName}</span> biće
              blokirano za <span className="font-semibold">{dateLabel}</span>,{" "}
              <span className="font-semibold">{mealLabel}</span>. Kuhinja će dobiti obaveštenje da
              zameni ovo jelo.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-black/45">
            Razlog blokade *
          </label>
          <textarea
            className={`${staffInputClass} min-h-[80px] resize-y`}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Npr. Jelo sadrži alergen koji nije naveden, loš kvalitet..."
            value={reason}
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            className="rounded-xl border border-[var(--card-border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-black/5"
            onClick={onCancel}
            type="button"
          >
            Otkaži
          </button>
          <button
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason.trim())}
            type="button"
          >
            Blokiraj jelo
          </button>
        </div>
      </div>
    </div>
  );
}
