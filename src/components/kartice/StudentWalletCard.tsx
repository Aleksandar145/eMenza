"use client";

import { CreditCard, Sparkles } from "lucide-react";
import { CardStatusBadge } from "@/components/referent/CardStatusBadge";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import {
  formatCardValidUntilLabel,
  type StudentAccountSnapshot,
} from "@/lib/referent-cards-mock";

type StudentWalletCardProps = {
  snapshot: StudentAccountSnapshot;
};

export function StudentWalletCard({ snapshot }: StudentWalletCardProps) {
  const profile = useStudentProfile();
  return (
    <section className="overflow-hidden rounded-[24px] bg-white shadow-[0_8px_32px_rgba(80,85,210,0.18)]">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#5055D2] via-[#5a5fd8] to-[#9093E1] px-6 py-6 sm:px-8 sm:py-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-12 size-44 rounded-full bg-white/10 blur-sm"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 -left-8 size-36 rounded-full bg-white/5"
        />
        <p
          aria-hidden="true"
          className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 select-none text-5xl font-black tracking-[0.2em] text-white/[0.07] sm:text-6xl"
        >
          CARD
        </p>

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <CreditCard aria-hidden="true" className="text-white" size={22} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white/90">eMenza kartica</p>
              <p className="text-xs font-light text-white/60">Studentski restoran</p>
            </div>
          </div>
          <CardStatusBadge status={snapshot.effectiveStatus} />
        </div>

        <div className="relative mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
            Stanje na kartici
          </p>
          <p className="mt-1 text-4xl font-extrabold tabular-nums text-white sm:text-5xl">
            {snapshot.balanceFormatted}{" "}
            <span className="text-lg font-semibold text-white/75">{profile.currency}</span>
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-white/80">
            <Sparkles aria-hidden="true" size={14} />
            ~{snapshot.mealsEstimate} obroka
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-black/5 bg-[#EFF1F4]/40 px-6 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-8">
        <div>
          <p className="text-lg font-bold text-black">{snapshot.studentName}</p>
          <p className="mt-1 font-mono text-sm tracking-[0.25em] text-black/55">
            {snapshot.maskedNumber}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-black/45">Važi do</p>
          <p className="mt-0.5 text-sm font-semibold text-black">
            {formatCardValidUntilLabel(snapshot.validUntil)}
          </p>
          <p className="mt-1 font-mono text-[11px] text-black/35">{snapshot.cardId}</p>
        </div>
      </div>
    </section>
  );
}

export default StudentWalletCard;
