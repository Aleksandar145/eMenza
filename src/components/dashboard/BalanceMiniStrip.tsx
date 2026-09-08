"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, QrCode, Sparkles } from "lucide-react";
import { DopuniKarticuModal } from "@/components/dashboard/DopuniKarticuModal";
import { CardStatusBadge } from "@/components/referent/CardStatusBadge";
import { useCardAccess } from "@/components/shared/CardAccessProvider";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { useT } from "@/i18n/useT";

type BalanceMiniStripProps = {
  className?: string;
};

export function BalanceMiniStrip({ className = "" }: BalanceMiniStripProps) {
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const { snapshot, cardState } = useCardAccess();
  const profile = useStudentProfile();
  const { t } = useT();

  return (
    <>
      <section
        className={`flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-black/5 bg-white px-4 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.04)] lg:px-5 lg:py-3.5 ${className}`}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-black/45">
              {t("dashboard.cardBalance")}
            </p>
            <CardStatusBadge status={snapshot.effectiveStatus} />
          </div>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="text-xl font-extrabold tabular-nums text-[#5055D2] lg:text-2xl">
              {snapshot.balanceFormatted}{" "}
              <span className="text-sm font-semibold text-black/55">{profile.currency}</span>
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-black/55">
              <Sparkles aria-hidden="true" size={12} />
              ~{snapshot.mealsEstimate} {t("dashboard.mealsCountLabel")}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <button
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-[0_3px_12px_rgba(80,85,210,0.3)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={cardState !== "active"}
            onClick={() => setIsTopUpOpen(true)}
            style={{
              backgroundImage: "linear-gradient(95deg, #5055D2 0%, #6368e0 45%, #9093E1 100%)",
            }}
            type="button"
          >
            <Plus aria-hidden="true" size={16} strokeWidth={2.5} />
            {t("dashboard.topUp")}
          </button>
          <Link
            className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-[#5055D2] hover:underline"
            href="/kartice"
          >
            <QrCode aria-hidden="true" size={14} />
            {t("dashboard.cardQr")}
          </Link>
        </div>
      </section>

      <DopuniKarticuModal isOpen={isTopUpOpen} onClose={() => setIsTopUpOpen(false)} />
    </>
  );
}

export default BalanceMiniStrip;
