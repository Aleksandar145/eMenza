"use client";

import { Wallet } from "lucide-react";
import { useCardAccess } from "@/components/shared/CardAccessProvider";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { formatNumber } from "@/lib/admin-helpers";

type CreatorBalanceHintProps = {
  spentRsd: number;
  remainingRsd: number;
  variant: "header" | "footer" | "aside";
  className?: string;
};

export function CreatorBalanceHint({
  spentRsd,
  remainingRsd,
  variant,
  className = "",
}: CreatorBalanceHintProps) {
  const { snapshot, cardState } = useCardAccess();
  const profile = useStudentProfile();
  const isLoading = cardState === "loading";

  if (variant === "header") {
    return (
      <div
        className={`rounded-2xl bg-[#EFF1F4] px-3 py-2 text-right lg:px-4 ${className}`}
      >
        {isLoading ? (
          <div className="space-y-1.5">
            <div className="ml-auto h-3 w-16 animate-pulse rounded bg-black/10" />
            <div className="ml-auto h-5 w-24 animate-pulse rounded bg-black/10" />
          </div>
        ) : (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-black/45">
              Stanje na kartici
            </p>
            <p className="text-sm font-extrabold tabular-nums text-[#5055D2] lg:text-base">
              {snapshot.balanceFormatted}{" "}
              <span className="text-[10px] font-semibold text-black/45">{profile.currency}</span>
            </p>
            {spentRsd > 0 ? (
              <p className="mt-0.5 text-[10px] font-medium tabular-nums text-black/50">
                −{formatNumber(spentRsd)} → ostaje {formatNumber(remainingRsd)}
              </p>
            ) : null}
          </>
        )}
      </div>
    );
  }

  if (variant === "footer") {
    if (isLoading) {
      return (
        <div className={`h-4 w-40 animate-pulse rounded bg-black/8 ${className}`} />
      );
    }

    return (
      <p className={`text-xs font-medium tabular-nums text-black/55 lg:text-sm ${className}`}>
        Ostaje na kartici: {formatNumber(remainingRsd)} {profile.currency}
      </p>
    );
  }

  if (isLoading) {
    return null;
  }

  return (
    <p
      className={`inline-flex items-center justify-center gap-1.5 text-xs font-medium tabular-nums text-white/80 ${className}`}
    >
      <Wallet aria-hidden="true" size={14} />
      Ostaje: {formatNumber(remainingRsd)} {profile.currency}
    </p>
  );
}

export default CreatorBalanceHint;
