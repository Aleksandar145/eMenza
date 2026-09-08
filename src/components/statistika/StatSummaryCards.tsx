"use client";

import type { LucideIcon } from "lucide-react";
import { Calculator, Minus, TrendingDown, TrendingUp, UtensilsCrossed, Wallet } from "lucide-react";
import {
  formatStatisticsRsd,
  type SpendingPeriod,
  type StatisticsSummary,
} from "@/lib/statistika-types";
import { useT } from "@/i18n/useT";
import { statsCard, statsCardHover, statsSectionLabel } from "@/components/statistika/statistics-ui";

type StatSummaryCardsProps = {
  summary?: StatisticsSummary;
  period?: SpendingPeriod;
  isLoading?: boolean;
};

function SummaryCardSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <div
      className={`rounded-[20px] p-5 ${
        featured
          ? "min-h-[148px] border border-black/[0.06] bg-gradient-to-br from-[#EFF1F4] via-white to-[#EFF1F4]/70"
          : statsCard
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="h-3 w-24 animate-pulse rounded bg-black/8" />
        <div className="size-10 animate-pulse rounded-2xl bg-black/8" />
      </div>
      <div className="h-8 w-36 animate-pulse rounded bg-black/8" />
      <div className="mt-3 h-3 w-44 animate-pulse rounded bg-black/8" />
    </div>
  );
}

function TrendBadge({ percent }: { percent: number | null }) {
  if (percent === null) {
    return (
      <span className="inline-flex rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-black/45">
        —
      </span>
    );
  }

  const formatted = Math.abs(percent).toLocaleString("sr-RS", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  if (percent > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600 ring-1 ring-red-100">
        ↑ +{formatted}%
      </span>
    );
  }
  if (percent < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600 ring-1 ring-red-100">
        ↓ {formatted}%
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-black/45">
      0%
    </span>
  );
}

function FeaturedSummaryCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <div className="relative flex h-full min-h-[148px] flex-col justify-between overflow-hidden rounded-[20px] border border-black/[0.06] bg-gradient-to-br from-[#EFF1F4] via-white to-[#EFF1F4]/70 p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)] lg:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-[#5055D2]/[0.06] blur-2xl"
      />

      <div className="relative mb-5 flex items-start justify-between gap-3">
        <span className={statsSectionLabel}>{label}</span>
        <div className="flex size-11 items-center justify-center rounded-2xl bg-white/80 ring-1 ring-[#5055D2]/10 shadow-sm">
          <Icon aria-hidden="true" className="text-[#5055D2]" size={20} strokeWidth={2} />
        </div>
      </div>

      <div className="relative">
        <p className="text-3xl font-extrabold tabular-nums tracking-tight text-black lg:text-4xl">
          {value}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-black/50">{detail}</p>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon: Icon,
  badge,
  iconClassName = "bg-gradient-to-br from-[#5055D2]/12 to-[#9093E1]/8 ring-1 ring-[#5055D2]/10",
  iconColorClassName = "text-[#5055D2]",
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  badge?: React.ReactNode;
  iconClassName?: string;
  iconColorClassName?: string;
}) {
  return (
    <div className={`group relative overflow-hidden ${statsCard} ${statsCardHover} p-5`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#5055D2]/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      <div className="mb-4 flex items-start justify-between gap-3">
        <span className={statsSectionLabel}>{label}</span>
        <div className="flex shrink-0 items-center gap-2">
          {badge}
          <div className={`flex size-10 items-center justify-center rounded-2xl ${iconClassName}`}>
            <Icon aria-hidden="true" className={iconColorClassName} size={18} strokeWidth={2} />
          </div>
        </div>
      </div>

      <p className="text-2xl font-extrabold tabular-nums tracking-tight text-black">{value}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-black/50">{detail}</p>
    </div>
  );
}

function formatPeriodCompare(summary: StatisticsSummary, t: ReturnType<typeof useT>["t"]) {
  if (summary.periodChangePercent === null) {
    return t("statistics.periodCompareUnavailable");
  }

  const absolute = Math.abs(summary.periodChangePercent);
  const formatted = absolute.toLocaleString("sr-RS", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  if (summary.periodChangePercent > 0) {
    return t("statistics.periodCompareUp", { percent: formatted });
  }
  if (summary.periodChangePercent < 0) {
    return t("statistics.periodCompareDown", { percent: formatted });
  }
  return t("statistics.periodCompareFlat");
}

export function StatSummaryCards({
  summary,
  period = "weekly",
  isLoading,
}: StatSummaryCardsProps) {
  const { t } = useT();

  if (isLoading || !summary) {
    return (
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:gap-4">
        <div className="sm:col-span-2 lg:col-span-5">
          <SummaryCardSkeleton featured />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-3 lg:col-span-7 lg:grid-cols-3 lg:gap-4">
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
        </div>
      </section>
    );
  }

  const monthSpent =
    period === "monthly" ? summary.periodSpentRsd : summary.monthSpentRsd;
  const monthChange =
    period === "monthly" ? summary.periodChangePercent : summary.monthChangePercent;
  const monthMeals =
    period === "monthly" ? summary.periodMealsCount : summary.mealsThisMonth;
  const monthMealsDetail =
    period === "monthly"
      ? t("statistics.mealsInPeriodCount", { count: monthMeals })
      : t("statistics.mealsThisMonth", { count: monthMeals });

  const MonthTrendIcon =
    monthChange === null || monthChange === 0
      ? Minus
      : monthChange < 0
        ? TrendingDown
        : TrendingUp;
  const monthIconClassName =
    monthChange !== null && monthChange < 0
      ? "bg-red-50 ring-1 ring-red-100"
      : monthChange !== null && monthChange > 0
        ? "bg-red-50 ring-1 ring-red-100"
        : "bg-gradient-to-br from-[#5055D2]/12 to-[#9093E1]/8 ring-1 ring-[#5055D2]/10";
  const monthIconColorClassName =
    monthChange !== null && monthChange !== 0 ? "text-red-600" : "text-[#5055D2]";

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:gap-4">
      <div className="sm:col-span-2 lg:col-span-5">
        <FeaturedSummaryCard
          detail={formatPeriodCompare(summary, t)}
          icon={Wallet}
          label={t("statistics.totalSpent")}
          value={formatStatisticsRsd(summary.periodSpentRsd)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-3 lg:col-span-7 lg:grid-cols-3 lg:gap-4">
        <SummaryCard
          badge={<TrendBadge percent={monthChange} />}
          detail={monthMealsDetail}
          icon={MonthTrendIcon}
          iconClassName={monthIconClassName}
          iconColorClassName={monthIconColorClassName}
          label={t("statistics.thisMonth")}
          value={formatStatisticsRsd(monthSpent)}
        />
        <SummaryCard
          detail={t("statistics.mealsInPeriodCount", { count: summary.periodMealsCount })}
          icon={UtensilsCrossed}
          label={t("statistics.reservedMeals")}
          value={String(summary.periodMealsCount)}
        />
        <SummaryCard
          detail={t("statistics.avgPerMealDetail")}
          icon={Calculator}
          label={t("statistics.avgPerMeal")}
          value={formatStatisticsRsd(summary.periodAvgPerMealRsd)}
        />
      </div>
    </section>
  );
}

export default StatSummaryCards;