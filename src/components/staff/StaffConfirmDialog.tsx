"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";

type StaffConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
};

export function StaffConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Potvrdi",
  cancelLabel = "Otkaži",
  variant = "warning",
  onConfirm,
  onCancel,
}: StaffConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
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

  const accentColor = variant === "danger" ? "text-red-600" : "text-amber-600";
  const confirmColor = variant === "danger"
    ? "bg-red-600 hover:bg-red-700"
    : "bg-[#5055D2] hover:bg-[#4045B2]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${variant === "danger" ? "bg-red-100" : "bg-amber-100"}`}>
            <AlertTriangle className={accentColor} size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[var(--text-primary)]">{title}</p>
            <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{message}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            className="rounded-xl border border-[var(--card-border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-black/5"
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${confirmColor}`}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
