"use client";

import { Key, CheckCircle, X } from "lucide-react";
import { staffButtonPrimaryClass } from "@/components/staff";
import type { StaffMember } from "@/lib/admin-system-mock";

type StaffResetPasswordModalProps = {
  target: {
    member: StaffMember;
    password: string;
  };
  onReset: () => void;
  onClose: () => void;
};

export function StaffResetPasswordModal({
  target,
  onReset,
  onClose,
}: StaffResetPasswordModalProps) {
  const hasPassword = !!target.password;

  if (hasPassword) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        onClick={onClose}
      >
        <div
          className="relative mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="absolute right-4 top-4 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-xl bg-green-100 text-green-700">
              <CheckCircle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                Lozinka resetovana
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                {target.member.name}
              </p>
            </div>
          </div>
          <div className="mt-5 rounded-xl bg-black/[0.03] p-4">
            <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
              Nova lozinka
            </p>
            <p className="mt-1 font-mono text-lg font-bold text-[#5055D2]">
              {target.password}
            </p>
          </div>
          <p className="mt-3 text-xs text-[var(--text-tertiary)]">
            Korisnik će morati da promeni lozinku prilikom sledećeg logovanja.
          </p>
          <div className="mt-5">
            <button
              className={`${staffButtonPrimaryClass} w-full justify-center`}
              onClick={onClose}
              type="button"
            >
              U redu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="relative mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          onClick={onClose}
          type="button"
        >
          <X size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Key size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              Resetuj lozinku
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {target.member.name}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-[var(--text-primary)]">
          Da li ste sigurni da želite da resetujete lozinku?
        </p>
        <p className="mt-1 text-xs text-[var(--text-tertiary)]">
          Korisnik će morati da promeni lozinku prilikom sledećeg logovanja.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            className="flex-1 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-black/[0.02]"
            onClick={onClose}
            type="button"
          >
            Otkaži
          </button>
          <button
            className="flex-1 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
            onClick={onReset}
            type="button"
          >
            Resetuj
          </button>
        </div>
      </div>
    </div>
  );
}
