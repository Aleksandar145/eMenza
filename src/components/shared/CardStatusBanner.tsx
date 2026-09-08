"use client";

import { AlertTriangle, Clock, RefreshCw, ShieldAlert } from "lucide-react";
import { useCardAccess } from "@/components/shared/CardAccessProvider";
import type { CardStatus } from "@/lib/referent-cards-mock";
import { useT } from "@/i18n/useT";

const iconByStatus: Record<Exclude<CardStatus, "active">, typeof AlertTriangle> = {
  pending_verification: Clock,
  blocked: ShieldAlert,
  expired: AlertTriangle,
};

type CardStatusBannerProps = {
  className?: string;
};

export function CardStatusBanner({ className = "" }: CardStatusBannerProps) {
  const { snapshot, statusCopy, refreshCard, isRefreshing, showCardLock } = useCardAccess();
  const { t } = useT();

  if (!showCardLock) {
    return null;
  }

  const Icon = iconByStatus[snapshot.effectiveStatus as Exclude<CardStatus, "active">] ?? AlertTriangle;

  return (
    <section
      className={`overflow-hidden rounded-[20px] border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 p-4 shadow-[0_2px_12px_rgba(180,83,9,0.08)] lg:p-5 ${className}`}
    >
      <div className="flex gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15">
          <Icon aria-hidden="true" className="text-amber-700" size={20} />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-amber-900">{statusCopy.title}</h2>
          <p className="mt-1 text-sm font-light leading-relaxed text-amber-950/75">
            {statusCopy.description}
          </p>
          {snapshot.effectiveStatus === "pending_verification" ? (
            <p className="mt-2 text-sm font-medium text-amber-900/80">
              {t("card.referentWorkingHours", { hours: t("card.referentHoursPeriod") })}
            </p>
          ) : null}
          <button
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-600/25 bg-white/70 px-3 py-1.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-white disabled:opacity-60"
            disabled={isRefreshing}
            onClick={refreshCard}
            type="button"
          >
            <RefreshCw
              aria-hidden="true"
              className={isRefreshing ? "animate-spin" : ""}
              size={14}
            />
            {isRefreshing ? t("card.refreshing") : t("card.refreshStatus")}
          </button>
        </div>
      </div>
    </section>
  );
}

export default CardStatusBanner;
