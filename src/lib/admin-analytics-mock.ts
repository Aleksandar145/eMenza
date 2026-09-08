import { calendarTodayDateKey } from "@/lib/dashboard-mock";
import { loadAdminSystemState } from "@/lib/admin-system-store";
import { loadReferentCardsState } from "@/lib/referent-cards-store";
import type { SystemAnalyticsEvent } from "@/lib/admin-system-mock";

export type AdminAnalyticsPeriod = "day" | "week" | "month" | "year";

export type AdminAnalyticsSummary = {
  period: AdminAnalyticsPeriod;
  label: string;
  totalMealsPaidRsd: number;
  mealCount: number;
  reservationCount: number;
  pickupCount: number;
  cashTopUpRsd: number;
  cashTopUpCount: number;
  avgFeedbackRating: number;
  feedbackCount: number;
  uniqueStudentsCount: number;
};

export type AdminAnalyticsDayRow = {
  dateKey: string;
  label: string;
  totalMealsPaidRsd: number;
  mealCount: number;
  reservationCount: number;
  cashTopUpRsd: number;
};

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

function eventDateKey(event: SystemAnalyticsEvent): string {
  return toDateKey(new Date(event.at));
}

function formatDayLabel(dateKey: string): string {
  return new Intl.DateTimeFormat("sr-RS", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseDateKey(dateKey));
}

function formatShortDayLabel(dateKey: string): string {
  return new Intl.DateTimeFormat("sr-RS", { day: "numeric", month: "short" }).format(parseDateKey(dateKey));
}

function getWeekStartDateKey(referenceDateKey: string): string {
  const date = parseDateKey(referenceDateKey);
  const dayOfWeek = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - dayOfWeek);
  return toDateKey(date);
}

function getPeriodDateKeys(period: AdminAnalyticsPeriod, referenceDateKey: string): string[] {
  if (period === "day") return [referenceDateKey];
  if (period === "week") {
    const start = getWeekStartDateKey(referenceDateKey);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }
  if (period === "month") {
    const ref = parseDateKey(referenceDateKey);
    const daysInMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) =>
      toDateKey(new Date(ref.getFullYear(), ref.getMonth(), i + 1)),
    );
  }
  const year = parseDateKey(referenceDateKey).getFullYear();
  const keys: string[] = [];
  for (let month = 0; month < 12; month += 1) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      keys.push(toDateKey(new Date(year, month, day)));
    }
  }
  return keys;
}

function getPeriodLabel(period: AdminAnalyticsPeriod, referenceDateKey: string): string {
  if (period === "day") return formatDayLabel(referenceDateKey);
  if (period === "week") {
    const keys = getPeriodDateKeys("week", referenceDateKey);
    return `${formatShortDayLabel(keys[0])} – ${formatShortDayLabel(keys[keys.length - 1])} ${parseDateKey(keys[keys.length - 1]).getFullYear()}.`;
  }
  if (period === "month") {
    return new Intl.DateTimeFormat("sr-RS", { month: "long", year: "numeric" }).format(parseDateKey(referenceDateKey));
  }
  return String(parseDateKey(referenceDateKey).getFullYear());
}

function collectEvents(referenceDateKey: string, period: AdminAnalyticsPeriod): SystemAnalyticsEvent[] {
  const dateKeys = new Set(getPeriodDateKeys(period, referenceDateKey));
  const adminState = loadAdminSystemState();
  const referentLogs = loadReferentCardsState().actionLogs;

  const analyticsEvents = adminState.analyticsSeed.filter((event) => dateKeys.has(eventDateKey(event)));

  const cashFromLogs: SystemAnalyticsEvent[] = referentLogs
    .filter((log) => log.action === "top_up" && dateKeys.has(toDateKey(new Date(log.at))))
    .map((log) => ({
      id: log.id,
      at: log.at,
      type: "cash_top_up" as const,
      amountRsd: log.amountRsd ?? 0,
      cardId: log.cardId,
    }));

  return [...analyticsEvents, ...cashFromLogs];
}

function aggregate(events: SystemAnalyticsEvent[], feedbackEntries: ReturnType<typeof loadAdminSystemState>["feedbackEntries"], dateKeys: Set<string>) {
  const cardIds = new Set<string>();
  let totalMealsPaidRsd = 0;
  let mealCount = 0;
  let reservationCount = 0;
  let pickupCount = 0;
  let cashTopUpRsd = 0;
  let cashTopUpCount = 0;

  for (const event of events) {
    if (event.cardId) cardIds.add(event.cardId);
    if (event.type === "meal_payment") {
      mealCount += 1;
      totalMealsPaidRsd += event.amountRsd ?? 0;
    } else if (event.type === "reservation") {
      reservationCount += 1;
    } else if (event.type === "pickup") {
      pickupCount += 1;
    } else if (event.type === "cash_top_up") {
      cashTopUpCount += 1;
      cashTopUpRsd += event.amountRsd ?? 0;
    }
  }

  const periodFeedback = feedbackEntries.filter((entry) => dateKeys.has(toDateKey(new Date(entry.submittedAt))));
  const avgFeedbackRating =
    periodFeedback.length > 0
      ? periodFeedback.reduce((sum, entry) => sum + entry.rating, 0) / periodFeedback.length
      : 0;

  return {
    totalMealsPaidRsd,
    mealCount,
    reservationCount,
    pickupCount,
    cashTopUpRsd,
    cashTopUpCount,
    avgFeedbackRating,
    feedbackCount: periodFeedback.length,
    uniqueStudentsCount: cardIds.size,
  };
}

export function getAdminAnalyticsReport(
  period: AdminAnalyticsPeriod,
  referenceDateKey: string = calendarTodayDateKey,
): AdminAnalyticsSummary {
  const dateKeys = new Set(getPeriodDateKeys(period, referenceDateKey));
  const events = collectEvents(referenceDateKey, period).filter((event) => dateKeys.has(eventDateKey(event)));
  const feedbackEntries = loadAdminSystemState().feedbackEntries;

  return {
    period,
    label: getPeriodLabel(period, referenceDateKey),
    ...aggregate(events, feedbackEntries, dateKeys),
  };
}

export function getAdminAnalyticsBreakdown(
  period: AdminAnalyticsPeriod,
  referenceDateKey: string = calendarTodayDateKey,
): AdminAnalyticsDayRow[] {
  if (period === "day" || period === "year") return [];

  const dateKeysList = getPeriodDateKeys(period, referenceDateKey);
  const allEvents = collectEvents(referenceDateKey, period);
  const feedbackEntries = loadAdminSystemState().feedbackEntries;

  return dateKeysList
    .map((dateKey) => {
      const dateKeys = new Set([dateKey]);
      const dayEvents = allEvents.filter((event) => eventDateKey(event) === dateKey);
      const agg = aggregate(dayEvents, feedbackEntries, dateKeys);
      return {
        dateKey,
        label: formatShortDayLabel(dateKey),
        totalMealsPaidRsd: agg.totalMealsPaidRsd,
        mealCount: agg.mealCount,
        reservationCount: agg.reservationCount,
        cashTopUpRsd: agg.cashTopUpRsd,
      };
    })
    .filter((row) => row.mealCount > 0 || row.reservationCount > 0 || row.cashTopUpRsd > 0);
}

export function getMealTypeBreakdown(period: AdminAnalyticsPeriod, referenceDateKey: string = calendarTodayDateKey) {
  const dateKeys = new Set(getPeriodDateKeys(period, referenceDateKey));
  const events = collectEvents(referenceDateKey, period).filter(
    (event) => event.type === "meal_payment" && dateKeys.has(eventDateKey(event)),
  );

  return {
    breakfast: events.filter((event) => event.mealType === "breakfast").length,
    lunch: events.filter((event) => event.mealType === "lunch").length,
    dinner: events.filter((event) => event.mealType === "dinner").length,
  };
}
