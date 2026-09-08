"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { staffButtonPrimaryClass } from "@/components/staff";

type StaffCreateSuccessModalProps = {
  data: {
    email: string;
    password: string;
    role: string;
  };
  onClose: () => void;
};

export function StaffCreateSuccessModal({ data, onClose }: StaffCreateSuccessModalProps) {
  const router = useRouter();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="relative mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
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
            <svg className="size-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              Zaposleni dodat
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Nalog je spreman za korišćenje.
            </p>
          </div>
        </div>
        <div className="mt-5 space-y-2 rounded-xl bg-black/[0.03] p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium text-[var(--text-secondary)]">Email</span>
            <span className="font-mono text-[var(--text-primary)]">{data.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-[var(--text-secondary)]">Lozinka</span>
            <span className="font-mono font-bold text-[#5055D2]">
              {data.password}
            </span>
          </div>
        </div>
        <p className="mt-3 text-xs text-[var(--text-tertiary)]">
          Zaposleni će prilikom prvog prijavljivanja odmah morati da promeni lozinku.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            className={`${staffButtonPrimaryClass} flex-1 justify-center`}
            onClick={onClose}
            type="button"
          >
            U redu
          </button>
          <button
            className="flex-1 rounded-xl bg-[#5055D2] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3d42b8]"
            onClick={() => {
              onClose();
              const loginPath =
                data.role === "admin"
                  ? "/admin/login"
                  : data.role === "kuvar" ||
                      data.role === "salter" ||
                      data.role === "moderator"
                    ? "/kuhinja/login"
                    : "/referent/login";
              router.push(loginPath);
            }}
            type="button"
          >
            Idi na prijavu
          </button>
        </div>
      </div>
    </div>
  );
}
