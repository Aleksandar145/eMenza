"use client";

import { useState } from "react";
import {
  formatStatisticsRsd,
  getMaxSpendingTotal,
  getMealTotal,
  type SpendingBarPoint,
} from "@/lib/statistika-types";
import { mealDotClass, mealLegend } from "@/lib/dashboard-mock";
import { useT } from "@/i18n/useT";
import { statsCard, statsCardHover, statsSectionLabel } from "@/components/statistika/statistics-ui";

type SpendingTrendChartProps = {
  title?: string;
  points?: SpendingBarPoint[];
  isLoading?: boolean;
};

const MEAL_TYPE_ORDER: (keyof SpendingBarPoint["meals"])[] = ["dinner", "lunch", "breakfast"];

function StackedBar({
  point,
  maxTotal,
  mealLabels,
}: {
  point: SpendingBarPoint;
  maxTotal: number;
  mealLabels: Record<keyof SpendingBarPoint["meals"], string>;
}) {
  const [hovered, setHovered] = useState(false);
  const total = getMealTotal(point.meals);
  const barHeightPercent = total === 0 ? 0 : (total / maxTotal) * 100;

  const segments: { key: keyof SpendingBarPoint["meals"]; className: string }[] =
    MEAL_TYPE_ORDER.map((key) => ({
      key,
      className:
        key === "dinner"
          ? "meal-dot-dinner"
          : key === "lunch"
            ? "meal-dot-lunch"
            : "meal-dot-breakfast",
    }));

  return (
    <div
      className="relative flex flex-1 flex-col items-center gap-2"
      onBlur={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {point.active && total > 0 ? (
        <span className="rounded-full bg-[#5055D2]/10 px-2.5 py-0.5 text-[10px] font-bold tabular-nums text-[#5055D2] ring-1 ring-[#5055D2]/15 lg:text-xs">
          {formatStatisticsRsd(total)}
        </span>
      ) : (
        <span className="h-4" />
      )}

      <div
        className="relative flex w-full min-w-[22px] flex-col justify-end lg:min-w-0"
        style={{ height: "11.5rem" }}
      >
        {hovered && total > 0 ? (
          <div className="absolute bottom-full left-1/2 z-10 mb-2.5 w-max max-w-[160px] -translate-x-1/2 rounded-2xl border border-black/[0.06] bg-white/95 px-3.5 py-2.5 text-left shadow-[0_12px_40px_rgba(0,0,0,0.14)] backdrop-blur-sm">
            <p className="text-xs font-bold tabular-nums text-black">{formatStatisticsRsd(total)}</p>
            <div className="mt-1.5 space-y-0.5 border-t border-black/5 pt-1.5">
              {segments.map(({ key }) => {
                const value = point.meals[key];
                if (value <= 0) return null;
                return (
                  <p className="text-[10px] text-black/55" key={key}>
                    {mealLabels[key]}: {formatStatisticsRsd(value)}
                  </p>
                );
              })}
            </div>
          </div>
        ) : null}

        {total > 0 ? (
          <div
            className={`flex w-full flex-col justify-end overflow-hidden rounded-t-[10px] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-[height,transform,box-shadow] duration-500 ease-out ${
              hovered ? "scale-[1.04] shadow-[0_4px_16px_rgba(80,85,210,0.2)]" : ""
            } ${point.active ? "ring-2 ring-[#5055D2]/30 ring-offset-2 ring-offset-[#EFF1F4]" : ""}`}
            style={{ height: `${barHeightPercent}%` }}
          >
            {segments.map(({ key, className }) => {
              const value = point.meals[key];
              if (value <= 0) return null;
              const segmentHeight = (value / total) * 100;

              return (
                <div
                  className={`w-full ${className} ${point.active ? "" : "opacity-70"}`}
                  key={key}
                  style={{ height: `${segmentHeight}%` }}
                />
              );
            })}
          </div>
        ) : (
          <div className="h-1.5 w-full rounded-t-lg bg-black/[0.04]" />
        )}
      </div>

      <span
        className={`text-center text-[11px] lg:text-xs ${
          point.active ? "font-bold text-[#5055D2]" : "font-medium text-black/40"
        }`}
      >
        {point.label}
      </span>
    </div>
  );
}

export function SpendingTrendChart({ title, points = [], isLoading }: SpendingTrendChartProps) {
  const { t } = useT();
  const maxTotal = getMaxSpendingTotal(points);
  const hasSpend = points.some((point) => getMealTotal(point.meals) > 0);
  const guideLines = [0.25, 0.5, 0.75];
  const mealLabels = Object.fromEntries(
    mealLegend.map((item) => [item.type, item.label]),
  ) as Record<keyof SpendingBarPoint["meals"], string>;

  return (
    <div className={`flex h-full flex-col ${statsCard} ${statsCardHover} p-5 lg:p-6`}>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold tracking-tight text-black lg:text-lg">
            {t("statistics.spendingTrend")}
          </h2>
          <p className="mt-0.5 text-xs text-black/50 lg:text-sm">
            {isLoading ? t("statistics.loading") : title}
          </p>
        </div>
        <span className={`hidden shrink-0 sm:inline ${statsSectionLabel}`}>
          {t("statistics.spending")}
        </span>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-end justify-between gap-2 rounded-2xl bg-gradient-to-b from-[#EFF1F4]/80 to-[#EFF1F4]/40 p-4 ring-1 ring-black/[0.04]">
          {Array.from({ length: 7 }, (_, index) => (
            <div className="flex flex-1 flex-col items-center gap-2" key={index}>
              <div className="h-44 w-full animate-pulse rounded-t-xl bg-black/8" />
              <div className="h-3 w-7 animate-pulse rounded bg-black/8" />
            </div>
          ))}
        </div>
      ) : !hasSpend ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[#5055D2]/15 bg-gradient-to-b from-[#5055D2]/[0.03] to-transparent py-16">
          <p className="text-sm text-black/45">{t("statistics.noSpendInPeriod")}</p>
        </div>
      ) : (
        <div className="relative flex flex-1 items-end justify-between gap-1.5 rounded-2xl bg-gradient-to-b from-[#EFF1F4]/90 to-white p-4 ring-1 ring-black/[0.04] lg:gap-3">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-4 bottom-10 top-4">
            {guideLines.map((ratio) => (
              <div
                className="absolute left-0 right-0 border-t border-dashed border-black/[0.05]"
                key={ratio}
                style={{ bottom: `${ratio * 100}%` }}
              />
            ))}
          </div>
          {points.map((point) => (
            <StackedBar key={point.label} maxTotal={maxTotal} mealLabels={mealLabels} point={point} />
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-black/[0.05] pt-4">
        {mealLegend.map((item) => (
          <div className="flex items-center gap-2 text-xs text-black/55" key={item.label}>
            <span
              aria-hidden="true"
              className={`size-2.5 rounded-full shadow-sm ${mealDotClass(item.type)}`}
            />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SpendingTrendChart;
