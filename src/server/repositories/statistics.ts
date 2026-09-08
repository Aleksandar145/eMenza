import { and, desc, eq, inArray } from "drizzle-orm";
import type { MealType } from "@/lib/meal-types";

import type {
  MealBreakdownItem,
  MealSpendingSlice,
  SpendingBarPoint,
  SpendingPeriod,
  StatisticsSummary,
  StatisticsTransaction,
  TransactionType,
} from "@/lib/statistika-types";
import { getDb } from "@/server/db";
import { cardActionLogs, mealReservations } from "@/server/db/schema";

const WEEKDAY_LABELS = ["Pon", "Uto", "Sre", "Čet", "Pet", "Sub", "Ned"] as const;
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Maj",
  "Jun",
  "Jul",
  "Avg",
  "Sep",
  "Okt",
  "Nov",
  "Dec",
] as const;

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Doručak",
  lunch: "Ručak",
  dinner: "Večera",
};

type ReservationRow = typeof mealReservations.$inferSelect;
type CardLogRow = typeof cardActionLogs.$inferSelect;

export type StatisticsQuery = {
  profileId: string;
  cardId?: string;
  period: SpendingPeriod;
  anchorDate?: string;
  periodOffset?: number;
  now?: Date;
  page?: number;
  pageSize?: number;
  types?: TransactionType[];
  from?: Date;
  to?: Date;
};

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function getWeekStart(date: Date): Date {
  const next = startOfDay(date);
  const dayOfWeek = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - dayOfWeek);
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function emptyMeals(): MealSpendingSlice {
  return { breakfast: 0, lunch: 0, dinner: 0 };
}

function addMealSpend(slice: MealSpendingSlice, mealType: MealType, amount: number) {
  slice[mealType] += amount;
}

const STATS_DATE_LOCALE = "sr-Latn-RS";

function formatMonthTitle(date: Date) {
  return new Intl.DateTimeFormat(STATS_DATE_LOCALE, { month: "long", year: "numeric" }).format(date);
}

function formatWeekTitle(weekStart: Date) {
  const weekEnd = addDays(weekStart, 6);
  const startLabel = new Intl.DateTimeFormat(STATS_DATE_LOCALE, {
    day: "numeric",
    month: "long",
  }).format(weekStart);
  const endLabel = new Intl.DateTimeFormat(STATS_DATE_LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(weekEnd);
  return `${startLabel} – ${endLabel}`;
}

function getTrendRange(period: SpendingPeriod, now: Date) {
  if (period === "weekly") {
    const start = getWeekStart(now);
    const end = endOfDay(addDays(start, 6));
    return { start, end, title: formatWeekTitle(start) };
  }

  if (period === "monthly") {
    const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    const end = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    return { start, end, title: formatMonthTitle(now) };
  }

  const start = startOfDay(new Date(now.getFullYear(), 0, 1));
  const end = endOfDay(new Date(now.getFullYear(), 11, 31));
  return { start, end, title: `${now.getFullYear()}.` };
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function shiftPeriodAnchor(period: SpendingPeriod, now: Date, offset: number): Date {
  if (offset === 0) {
    return now;
  }

  if (period === "weekly") {
    return addDays(now, offset * 7);
  }

  if (period === "monthly") {
    return addMonths(now, offset);
  }

  const next = new Date(now);
  next.setFullYear(next.getFullYear() + offset);
  return next;
}

function buildTrendBuckets(
  period: SpendingPeriod,
  anchor: Date,
  realNow: Date,
  highlightCurrent: boolean,
): SpendingBarPoint[] {
  if (period === "weekly") {
    const weekStart = getWeekStart(anchor);
    return WEEKDAY_LABELS.map((label, index) => {
      const day = addDays(weekStart, index);
      return {
        label,
        meals: emptyMeals(),
        active: highlightCurrent && isSameDay(day, realNow),
        bucketStart: toDateKey(day),
        bucketEnd: toDateKey(day),
      };
    });
  }

  if (period === "monthly") {
    const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    const buckets: SpendingBarPoint[] = [];
    let cursor = getWeekStart(monthStart);
    let index = 1;
    const currentWeekStart = getWeekStart(realNow);

    while (cursor <= monthEnd) {
      const bucketStart = cursor < monthStart ? monthStart : cursor;
      const bucketEnd = addDays(getWeekStart(cursor), 6);
      const clippedEnd = bucketEnd > monthEnd ? monthEnd : bucketEnd;
      buckets.push({
        label: `N${index}`,
        meals: emptyMeals(),
        active: highlightCurrent && isSameDay(getWeekStart(cursor), currentWeekStart),
        bucketStart: toDateKey(bucketStart),
        bucketEnd: toDateKey(clippedEnd),
      });
      cursor = addDays(getWeekStart(cursor), 7);
      index += 1;
    }

    return buckets.length > 0
      ? buckets
      : [
          {
            label: "N1",
            meals: emptyMeals(),
            active: false,
            bucketStart: toDateKey(monthStart),
            bucketEnd: toDateKey(monthEnd),
          },
        ];
  }

  return MONTH_LABELS.map((label, index) => ({
    label,
    meals: emptyMeals(),
    active:
      highlightCurrent &&
      realNow.getFullYear() === anchor.getFullYear() &&
      realNow.getMonth() === index,
    bucketStart: toDateKey(new Date(anchor.getFullYear(), index, 1)),
    bucketEnd: toDateKey(new Date(anchor.getFullYear(), index + 1, 0)),
  }));
}

function reservationInBucket(
  row: ReservationRow,
  bucket: SpendingBarPoint,
  period: SpendingPeriod,
  anchor: Date,
) {
  const mealDate = parseDateKey(row.dateKey);

  if (period === "weekly") {
    const weekStart = getWeekStart(anchor);
    const dayIndex = (mealDate.getDay() + 6) % 7;
    const bucketDay = addDays(weekStart, dayIndex);
    return isSameDay(mealDate, bucketDay) && bucket.label === WEEKDAY_LABELS[dayIndex];
  }

  if (period === "monthly") {
    return (
      row.dateKey >= (bucket.bucketStart ?? "") &&
      row.dateKey <= (bucket.bucketEnd ?? "")
    );
  }

  return mealDate.getMonth() === MONTH_LABELS.indexOf(bucket.label as (typeof MONTH_LABELS)[number]);
}

function reservationInRange(row: ReservationRow, start: Date, end: Date) {
  const mealDate = parseDateKey(row.dateKey);
  return mealDate >= startOfDay(start) && mealDate <= endOfDay(end);
}

function classifyTopUpType(detail: string): TransactionType | null {
  if (detail.includes("Gotovinska")) {
    return "top_up_cash";
  }
  if (detail.includes("Bankarska")) {
    return "top_up_bank";
  }
  return null;
}

function mapReservationTransaction(row: ReservationRow): StatisticsTransaction {
  const mealLabel = MEAL_LABELS[row.mealType as MealType];
  return {
    id: `reservation-${row.id}`,
    createdAt: row.createdAt.toISOString(),
    type: "meal_charge",
    description: `${mealLabel} — ${row.obrok}`,
    amountRsd: -Number(row.totalRsd),
    status: "success",
  };
}

function mapCardLogTransaction(row: CardLogRow): StatisticsTransaction | null {
  if (row.action === "refund") {
    return {
      id: `log-${row.id}`,
      createdAt: row.createdAt.toISOString(),
      type: "refund",
      description: row.detail,
      amountRsd: Number(row.amountRsd ?? 0),
      status: "success",
    };
  }

  if (row.action === "top_up") {
    const type = classifyTopUpType(row.detail);
    if (!type) {
      return null;
    }

    return {
      id: `log-${row.id}`,
      createdAt: row.createdAt.toISOString(),
      type,
      description: row.detail,
      amountRsd: Number(row.amountRsd ?? 0),
      status: "success",
    };
  }

  return null;
}

async function loadReservations(profileId: string) {
  const db = getDb();
  return db
    .select()
    .from(mealReservations)
    .where(eq(mealReservations.profileId, profileId))
    .orderBy(desc(mealReservations.createdAt));
}

export async function resolveStatisticsCardId(profileId: string) {
  const db = getDb();
  const [row] = await db
    .select({ cardId: mealReservations.cardId })
    .from(mealReservations)
    .where(eq(mealReservations.profileId, profileId))
    .orderBy(desc(mealReservations.createdAt))
    .limit(1);

  return row?.cardId;
}

async function loadCardLogs(cardId: string) {
  const db = getDb();
  try {
    return await db
      .select()
      .from(cardActionLogs)
      .where(
        and(
          eq(cardActionLogs.cardId, cardId),
          inArray(cardActionLogs.action, ["refund", "top_up"]),
        ),
      )
      .orderBy(desc(cardActionLogs.createdAt));
  } catch (error) {
    console.warn(
      "[statistics] loadCardLogs failed for refund+top_up; retrying top_up only",
      error,
    );

    return db
      .select()
      .from(cardActionLogs)
      .where(and(eq(cardActionLogs.cardId, cardId), eq(cardActionLogs.action, "top_up")))
      .orderBy(desc(cardActionLogs.createdAt));
  }
}

function buildSummary(
  reservations: ReservationRow[],
  realNow: Date,
  period: SpendingPeriod,
  periodAnchor: Date,
): StatisticsSummary {
  const totalSpentRsd = reservations.reduce((sum, row) => sum + Number(row.totalRsd), 0);
  const reservedMealsCount = reservations.length;

  const monthStart = startOfDay(new Date(realNow.getFullYear(), realNow.getMonth(), 1));
  const monthEnd = endOfDay(new Date(realNow.getFullYear(), realNow.getMonth() + 1, 0));
  const prevMonthStart = startOfDay(new Date(realNow.getFullYear(), realNow.getMonth() - 1, 1));
  const prevMonthEnd = endOfDay(new Date(realNow.getFullYear(), realNow.getMonth(), 0));

  const mealsThisMonth = reservations.filter((row) => {
    const mealDate = parseDateKey(row.dateKey);
    return mealDate >= monthStart && mealDate <= monthEnd;
  }).length;

  const monthSpentRsd = reservations
    .filter((row) => row.createdAt >= monthStart && row.createdAt <= monthEnd)
    .reduce((sum, row) => sum + Number(row.totalRsd), 0);

  const prevMonthSpentRsd = reservations
    .filter((row) => row.createdAt >= prevMonthStart && row.createdAt <= prevMonthEnd)
    .reduce((sum, row) => sum + Number(row.totalRsd), 0);

  const monthChangePercent =
    prevMonthSpentRsd > 0
      ? ((monthSpentRsd - prevMonthSpentRsd) / prevMonthSpentRsd) * 100
      : null;

  const range = getTrendRange(period, periodAnchor);
  const prevAnchor = shiftPeriodAnchor(period, periodAnchor, -1);
  const prevRange = getTrendRange(period, prevAnchor);

  const periodScoped = reservations.filter((row) => reservationInRange(row, range.start, range.end));
  const prevPeriodScoped = reservations.filter((row) =>
    reservationInRange(row, prevRange.start, prevRange.end),
  );

  const periodSpentRsd = periodScoped.reduce((sum, row) => sum + Number(row.totalRsd), 0);
  const prevPeriodSpentRsd = prevPeriodScoped.reduce((sum, row) => sum + Number(row.totalRsd), 0);
  const periodMealsCount = periodScoped.length;
  const periodChangePercent =
    prevPeriodSpentRsd > 0
      ? ((periodSpentRsd - prevPeriodSpentRsd) / prevPeriodSpentRsd) * 100
      : null;
  const periodAvgPerMealRsd =
    periodMealsCount > 0 ? Math.round(periodSpentRsd / periodMealsCount) : 0;

  return {
    totalSpentRsd,
    reservedMealsCount,
    periodSpentRsd,
    periodMealsCount,
    periodAvgPerMealRsd,
    periodChangePercent,
    prevPeriodSpentRsd,
    mealsThisMonth,
    monthSpentRsd,
    prevMonthSpentRsd,
    monthChangePercent,
  };
}

function buildTrend(
  reservations: ReservationRow[],
  period: SpendingPeriod,
  anchor: Date,
  realNow: Date,
  highlightCurrent: boolean,
): { title: string; points: SpendingBarPoint[] } {
  const range = getTrendRange(period, anchor);
  const points = buildTrendBuckets(period, anchor, realNow, highlightCurrent);

  for (const row of reservations) {
    if (!reservationInRange(row, range.start, range.end)) {
      continue;
    }

    for (const point of points) {
      if (reservationInBucket(row, point, period, anchor)) {
        addMealSpend(point.meals, row.mealType as MealType, Number(row.totalRsd));
        break;
      }
    }
  }

  return { title: range.title, points };
}

function buildBreakdown(
  reservations: ReservationRow[],
  period: SpendingPeriod,
  anchor: Date,
): { title: string; total: number; items: MealBreakdownItem[] } {
  const range = getTrendRange(period, anchor);
  const scoped = reservations.filter((row) => reservationInRange(row, range.start, range.end));
  const counts: Record<MealType, { count: number; amountRsd: number }> = {
    breakfast: { count: 0, amountRsd: 0 },
    lunch: { count: 0, amountRsd: 0 },
    dinner: { count: 0, amountRsd: 0 },
  };

  for (const row of scoped) {
    const mealType = row.mealType as MealType;
    counts[mealType].count += 1;
    counts[mealType].amountRsd += Number(row.totalRsd);
  }

  const total = scoped.length;
  const items: MealBreakdownItem[] = (["breakfast", "lunch", "dinner"] as MealType[]).map(
    (type) => ({
      label: MEAL_LABELS[type],
      type,
      count: counts[type].count,
      amountRsd: counts[type].amountRsd,
      percent: total > 0 ? Math.round((counts[type].count / total) * 100) : 0,
    }),
  );

  return { title: range.title, total, items };
}

function buildTransactions(
  reservations: ReservationRow[],
  logs: CardLogRow[],
  query: StatisticsQuery,
) {
  const transactions: StatisticsTransaction[] = [
    ...reservations.map(mapReservationTransaction),
    ...logs.map(mapCardLogTransaction).filter((entry): entry is StatisticsTransaction => Boolean(entry)),
  ].sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  const filtered = transactions.filter((transaction) => {
    if (query.types && query.types.length > 0 && !query.types.includes(transaction.type)) {
      return false;
    }

    const createdAt = new Date(transaction.createdAt);
    if (query.from && createdAt < query.from) {
      return false;
    }
    if (query.to && createdAt > query.to) {
      return false;
    }

    return true;
  });

  const pageSize = query.pageSize ?? 10;
  const page = query.page ?? 1;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    transactions: filtered.slice(start, start + pageSize),
    pagination: {
      page: safePage,
      pageSize,
      total,
      totalPages,
    },
    allTransactions: filtered,
  };
}

function isCurrentPeriod(period: SpendingPeriod, anchor: Date, realNow: Date): boolean {
  const anchorRange = getTrendRange(period, anchor);
  const currentRange = getTrendRange(period, realNow);
  return anchorRange.start.getTime() === currentRange.start.getTime();
}

function resolvePeriodAnchor(query: StatisticsQuery, realNow: Date): Date {
  if (query.anchorDate) {
    return parseDateKey(query.anchorDate);
  }

  const periodOffset = query.periodOffset ?? 0;
  if (periodOffset !== 0) {
    return shiftPeriodAnchor(query.period, realNow, periodOffset);
  }

  return realNow;
}

export async function getStudentStatisticsDb(query: StatisticsQuery) {
  const realNow = query.now ?? new Date();
  const periodAnchor = resolvePeriodAnchor(query, realNow);
  const highlightCurrent = isCurrentPeriod(query.period, periodAnchor, realNow);
  const periodRange = getTrendRange(query.period, periodAnchor);

  const reservations = await loadReservations(query.profileId);
  const logs = query.cardId ? await loadCardLogs(query.cardId) : [];

  const summary = buildSummary(reservations, realNow, query.period, periodAnchor);
  const trend = buildTrend(
    reservations,
    query.period,
    periodAnchor,
    realNow,
    highlightCurrent,
  );
  const breakdown = buildBreakdown(reservations, query.period, periodAnchor);

  const scopedQuery: StatisticsQuery = {
    ...query,
    from: query.from ?? periodRange.start,
    to: query.to ?? periodRange.end,
  };
  const { transactions, pagination, allTransactions } = buildTransactions(
    reservations,
    logs,
    scopedQuery,
  );

  return {
    summary,
    trend: {
      period: query.period,
      ...trend,
    },
    breakdown,
    transactions,
    pagination,
    allTransactions,
    hasData: reservations.length > 0 || logs.length > 0,
  };
}

export function statisticsTransactionsToCsv(transactions: StatisticsTransaction[]) {
  const header = "Datum,Tip,Opis,Status,Iznos (RSD)";
  const rows = transactions.map((transaction) => {
    const date = new Intl.DateTimeFormat(STATS_DATE_LOCALE).format(new Date(transaction.createdAt));
    const amount = transaction.amountRsd.toFixed(2);
    const escapedDescription = `"${transaction.description.replace(/"/g, '""')}"`;
    return `${date},${transaction.type},${escapedDescription},${transaction.status},${amount}`;
  });

  return [header, ...rows].join("\n");
}
