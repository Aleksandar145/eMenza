"use client";

import { Sparkles } from "lucide-react";
import { buildStatisticsInsights } from "@/lib/statistika-insights";
import type { MealBreakdownItem, SpendingBarPoint } from "@/lib/statistika-types";
import { useT } from "@/i18n/useT";
import {
  statsCard,
  statsHeroGradient,
  statsOrbSecondary,
} from "@/components/statistika/statistics-ui";

type StatisticsInsightsProps = {
  items?: MealBreakdownItem[];
  points?: SpendingBarPoint[];
  isLoading?: boolean;
};

export function StatisticsInsights({ items = [], points = [], isLoading }: StatisticsInsightsProps) {
  const { t } = useT();

  if (isLoading) {
    return (
      <div className={`${statsCard} px-4 py-4 lg:px-5`}>
        <div className="h-4 w-full max-w-lg animate-pulse rounded bg-black/8" />
      </div>
    );
  }

  const insights = buildStatisticsInsights(items, points);
  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {insights.map((insight) => (
        <div
          className={`relative overflow-hidden ${statsCard} px-4 py-4 lg:px-5`}
          key={insight.id}
        >
          <div
            aria-hidden="true"
            className={`absolute inset-y-0 left-0 w-1 ${statsHeroGradient}`}
          />
          <div aria-hidden="true" className={`${statsOrbSecondary} -right-6 top-1/2 size-20 -translate-y-1/2`} />

          <div className="relative flex items-start gap-3 pl-2">
            <div
              className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${statsHeroGradient} text-white shadow-[0_4px_14px_rgba(80,85,210,0.35)]`}
            >
              <Sparkles aria-hidden="true" size={15} />
            </div>
            <p className="pt-1 text-sm leading-relaxed text-black/70">
              {t(`statistics.${insight.messageKey}`, insight.values)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default StatisticsInsights;
