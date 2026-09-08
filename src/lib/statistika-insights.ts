import {
  formatStatisticsRsd,
  getMealTotal,
  type MealBreakdownItem,
  type SpendingBarPoint,
} from "@/lib/statistika-types";

export type StatisticsInsight = {
  id: string;
  messageKey: "insightTopMeal" | "insightPeriodSpend" | "insightPeriodSpendOnly";
  values: Record<string, string | number>;
};

export function buildStatisticsInsights(
  items: MealBreakdownItem[],
  points: SpendingBarPoint[],
): StatisticsInsight[] {
  const insights: StatisticsInsight[] = [];

  const topMeal = [...items].sort((left, right) => right.count - left.count)[0];
  if (topMeal && topMeal.count > 0 && topMeal.percent > 0) {
    insights.push({
      id: "top-meal",
      messageKey: "insightTopMeal",
      values: {
        meal: topMeal.label,
        percent: topMeal.percent,
      },
    });
  }

  const periodTotal = points.reduce((sum, point) => sum + getMealTotal(point.meals), 0);
  if (periodTotal > 0) {
    const busiest = [...points]
      .map((point) => ({ label: point.label, total: getMealTotal(point.meals) }))
      .sort((left, right) => right.total - left.total)[0];

    if (busiest && busiest.total > 0) {
      insights.push({
        id: "period-spend",
        messageKey: "insightPeriodSpend",
        values: {
          amount: formatStatisticsRsd(periodTotal),
          day: busiest.label,
        },
      });
    } else {
      insights.push({
        id: "period-spend-only",
        messageKey: "insightPeriodSpendOnly",
        values: {
          amount: formatStatisticsRsd(periodTotal),
        },
      });
    }
  }

  return insights.slice(0, 2);
}
