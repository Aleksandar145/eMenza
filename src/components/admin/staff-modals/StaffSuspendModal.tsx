"use client";

import { useState } from "react";
import { Ban, CheckCircle, X } from "lucide-react";
import { staffInputClass, staffLabelClass } from "@/components/staff";
import type { StaffMember } from "@/lib/admin-system-mock";

type StaffSuspendModalProps = {
  target: {
    member: StaffMember;
    action: "suspend" | "activate";
  };
  onConfirm: (reason: string) => void;
  onCancel: () => void;
};

export function StaffSuspendModal({
  target,
  onConfirm,
  onCancel,
}: StaffSuspendModalProps) {
  const [reason, setReason] = useState("");
  const isSuspend = target.action === "suspend";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="relative mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          onClick={onCancel}
          type="button"
        >
          <X size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div className={`flex size-12 items-center justify-center rounded-xl ${
            isSuspend ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
          }`}>
            {isSuspend ? <Ban size={24} /> : <CheckCircle size={24} />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              {isSuspend ? "Suspenduj nalog" : "Aktiviraj nalog"}
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {target.member.name}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-[var(--text-primary)]">
          {isSuspend
            ? "Zaposleni neće moći da se prijavi na sistem."
            : "Zaposleni će ponovo moći da se prijavi na sistem."}
        </p>
        {isSuspend && (
          <div className="mt-3">
            <label className={staffLabelClass}>Razlog suspenzije</label>
            <textarea
              className={`${staffInputClass} min-h-[80px] resize-y`}
              placeholder="Unesite razlog suspenzije..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}
        <div className="mt-5 flex gap-3">
          <button
            className="flex-1 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-black/[0.02]"
            onClick={onCancel}
            type="button"
          >
            Otkaži
          </button>
          <button
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors ${
              isSuspend
                ? "bg-orange-600 hover:bg-orange-700"
                : "bg-green-600 hover:bg-green-700"
            }`}
            onClick={() => onConfirm(reason)}
            type="button"
          >
            {isSuspend ? "Suspenduj" : "Aktiviraj"}
          </button>
        </div>
      </div>
    </div>
  );
}
