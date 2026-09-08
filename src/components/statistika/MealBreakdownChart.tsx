"use client";

import { useEffect, useState } from "react";
import { formatStatisticsRsd, type MealBreakdownItem } from "@/lib/statistika-types";
import { mealDotClass } from "@/lib/dashboard-mock";
import { useT } from "@/i18n/useT";
import {
  statsCard,
  statsCardHover,
  statsSectionLabel,
} from "@/components/statistika/statistics-ui";

type MealBreakdownChartProps = {
  title?: string;
  total?: number;
  items?: MealBreakdownItem[];
  isLoading?: boolean;
};

function buildDonutSegments(items: MealBreakdownItem[]) {
  const circumference = 2 * Math.PI * 42;
  let offset = 0;

  return items.map((item) => {
    const dash = (item.percent / 100) * circumference;
    const segment = {
      ...item,
      dash,
      offset,
      strokeClass:
        item.type === "breakfast"
          ? "stroke-[var(--meal-breakfast)]"
          : item.type === "lunch"
            ? "stroke-[var(--meal-lunch)]"
            : "stroke-[var(--meal-dinner)]",
    };
    offset += dash;
    return segment;
  });
}

const donutCircumference = 2 * Math.PI * 42;

function formatMealCount(count: number, t: ReturnType<typeof useT>["t"]) {
  return count === 1
    ? t("statistics.mealCountOne", { count })
    : t("statistics.mealCountMany", { count });
}

export function MealBreakdownChart({ title, total = 0, items = [], isLoading }: MealBreakdownChartProps) {
  const { t } = useT();
  const [animated, setAnimated] = useState(false);
  const donutSegments = buildDonutSegments(items);

  useEffect(() => {
    if (isLoading || total === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnimated(false);
      return;
    }

    const frame = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(frame);
  }, [isLoading, total, items]);

  return (
    <div className={`flex h-full flex-col ${statsCard} ${statsCardHover} p-5 lg:p-6`}>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold tracking-tight text-black lg:text-lg">
            {t("statistics.mealBreakdown")}
          </h2>
          <p className="mt-0.5 text-xs text-black/50 lg:text-sm">
            {isLoading ? t("statistics.loading") : title}
          </p>
        </div>
        <span className={`hidden shrink-0 sm:inline ${statsSectionLabel}`}>
          {t("statistics.mealsCount")}
        </span>
      </div>

      {isLoading ? (
        <div className="mx-auto mb-5 size-36 animate-pulse rounded-full bg-black/8 lg:size-40" />
      ) : total === 0 ? (
        <div className="mb-5 flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[#5055D2]/15 bg-gradient-to-b from-[#5055D2]/[0.03] to-transparent py-12">
          <p className="text-sm text-black/45">{t("statistics.noSpendInPeriod")}</p>
        </div>
      ) : (
        <div className="relative mx-auto mb-5 flex size-36 items-center justify-center lg:size-40">
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-gradient-to-br from-[#5055D2]/8 to-[#9093E1]/5 ring-1 ring-[#5055D2]/10"
          />
          <svg aria-hidden="true" className="relative size-[88%] -rotate-90" viewBox="0 0 100 100">
            <circle
              className="text-white/90"
              cx="50"
              cy="50"
              fill="transparent"
              r="42"
              stroke="currentColor"
              strokeWidth="9"
            />
            {donutSegments.map((segment) => (
              <circle
                className={`${segment.strokeClass} transition-all duration-700 ease-out drop-shadow-sm`}
                cx="50"
                cy="50"
                fill="transparent"
                key={segment.label}
                r="42"
                strokeDasharray={`${animated ? segment.dash : 0} ${donutCircumference}`}
                strokeDashoffset={animated ? -segment.offset : 0}
                strokeLinecap="round"
                strokeWidth="9"
              />
            ))}
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-2xl font-extrabold tabular-nums tracking-tight text-black lg:text-3xl">
              {total}
            </span>
            <span className={`mt-0.5 ${statsSectionLabel}`}>{t("statistics.mealsInPeriod")}</span>
          </div>
        </div>
      )}

      <div className="mt-auto space-y-2">
        {isLoading
          ? Array.from({ length: 3 }, (_, index) => (
              <div className="space-y-2 rounded-xl bg-[#EFF1F4]/50 p-3 ring-1 ring-black/[0.03]" key={index}>
                <div className="h-3.5 w-full animate-pulse rounded bg-black/8" />
                <div className="h-1.5 w-full animate-pulse rounded-full bg-black/8" />
              </div>
            ))
          : items.map((item) => (
              <div
                className="rounded-xl bg-gradient-to-r from-[#EFF1F4]/60 to-white px-3 py-2.5 ring-1 ring-black/[0.04] transition-all hover:from-[#EFF1F4]/90 hover:ring-[#5055D2]/10"
                key={item.label}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`size-2.5 rounded-full shadow-sm ${mealDotClass(item.type)}`}
                    />
                    <span className="text-sm font-medium text-black">{item.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold tabular-nums text-black">
                      {formatMealCount(item.count, t)}
                    </span>
                    <span className="ml-2 text-xs tabular-nums text-black/45">
                      {formatStatisticsRsd(item.amountRsd)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/90 ring-1 ring-black/[0.03]">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${mealDotClass(item.type)}`}
                    style={{ width: animated ? `${item.percent}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}

export default MealBreakdownChart;
