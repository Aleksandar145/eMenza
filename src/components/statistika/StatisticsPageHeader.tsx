"use client";

import { BarChart3, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import type { SpendingPeriod } from "@/lib/statistika-types";
import { useT } from "@/i18n/useT";
import { StatisticsDatePicker } from "@/components/statistika/StatisticsDatePicker";
import {
  statsGlassOnDark,
  statsHeroGradient,
  statsHeroShadow,
  statsOrbPrimary,
  statsOrbSecondary,
  statsSectionLabel,
} from "@/components/statistika/statistics-ui";

type StatisticsPageHeaderProps = {
  period: SpendingPeriod;
  periodTitle?: string;
  anchorDateKey: string;
  maxDateKey: string;
  canGoNext: boolean;
  updatedAt?: Date | null;
  isRefreshing?: boolean;
  onPeriodChange: (period: SpendingPeriod) => void;
  onAnchorDateChange: (dateKey: string) => void;
  onPreviousPeriod: () => void;
  onNextPeriod: () => void;
  onRefresh: () => void;
};

export function StatisticsPageHeader({
  period,
  periodTitle,
  anchorDateKey,
  maxDateKey,
  canGoNext,
  updatedAt,
  isRefreshing,
  onPeriodChange,
  onAnchorDateChange,
  onPreviousPeriod,
  onNextPeriod,
  onRefresh,
}: StatisticsPageHeaderProps) {
  const { t } = useT();

  const periodLabels: { id: SpendingPeriod; label: string }[] = [
    { id: "weekly", label: t("statistics.periodWeekly") },
    { id: "monthly", label: t("statistics.periodMonthly") },
    { id: "yearly", label: t("statistics.periodYearly") },
  ];

  const updatedLabel =
    updatedAt &&
    t("statistics.updatedAt", {
      time: new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }).format(updatedAt),
    });

  return (
    <section
      className={`relative rounded-[20px] ${statsHeroGradient} ${statsHeroShadow}`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[20px]">
        <div className={`${statsOrbPrimary} -right-10 -top-10 size-44`} />
        <div className={`${statsOrbSecondary} -bottom-12 left-1/3 size-36`} />
      </div>

      <div className="relative flex flex-col gap-5 p-5 lg:flex-row lg:items-end lg:justify-between lg:p-6">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-white/75">
            <BarChart3 aria-hidden="true" size={15} strokeWidth={2.25} />
            <span className={statsSectionLabel.replace("text-black/40", "text-white/60")}>
              {t("statistics.subtitle")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              aria-label={t("statistics.periodPrevious")}
              className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full text-white transition-all hover:bg-white/20 ${statsGlassOnDark}`}
              onClick={onPreviousPeriod}
              type="button"
            >
              <ChevronLeft aria-hidden="true" size={18} />
            </button>

            <div className="min-w-0 flex-1 text-center lg:text-left">
              {periodTitle ? (
                <p className="truncate text-xl font-bold tracking-tight text-white lg:text-2xl">
                  {periodTitle}
                </p>
              ) : (
                <p className="text-xl font-bold tracking-tight text-white lg:text-2xl">
                  {t("statistics.title")}
                </p>
              )}
            </div>

            <button
              aria-label={t("statistics.periodNext")}
              className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full text-white transition-all hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-35 ${statsGlassOnDark}`}
              disabled={!canGoNext}
              onClick={onNextPeriod}
              type="button"
            >
              <ChevronRight aria-hidden="true" size={18} />
            </button>

            <StatisticsDatePicker
              anchorDateKey={anchorDateKey}
              maxDateKey={maxDateKey}
              onAnchorDateChange={onAnchorDateChange}
            />
          </div>

          {updatedLabel ? (
            <p className="mt-2 text-xs font-medium text-white/55 lg:pl-11">{updatedLabel}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className={`flex rounded-full p-1 ${statsGlassOnDark}`}>
            {periodLabels.map((item) => (
              <button
                className={`rounded-full px-3.5 py-1.5 text-sm transition-all duration-200 lg:px-4 ${
                  period === item.id
                    ? "bg-white font-semibold text-[#5055D2] shadow-[0_2px_10px_rgba(0,0,0,0.12)]"
                    : "font-medium text-white/75 hover:bg-white/10 hover:text-white"
                }`}
                key={item.id}
                onClick={() => onPeriodChange(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            aria-label={t("statistics.refresh")}
            className={`inline-flex size-10 items-center justify-center rounded-full text-white transition-all hover:bg-white/20 disabled:opacity-50 ${statsGlassOnDark}`}
            disabled={isRefreshing}
            onClick={onRefresh}
            type="button"
          >
            <RefreshCw
              aria-hidden="true"
              className={isRefreshing ? "animate-spin" : undefined}
              size={17}
            />
          </button>
        </div>
      </div>
    </section>
  );
}

export default StatisticsPageHeader;
