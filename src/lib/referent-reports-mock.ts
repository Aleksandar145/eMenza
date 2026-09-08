import { calendarTodayDateKey } from "@/lib/dashboard-mock";
import type { ReferentActionLog } from "@/lib/referent-cards-mock";

export type ReportPeriod = "day" | "week" | "month" | "year";

export type ReferentReportSummary = {
  period: ReportPeriod;
  label: string;
  totalCashTopUpRsd: number;
  topUpCount: number;
  activationsCount: number;
  extensionsCount: number;
  uniqueStudentsCount: number;
  blocksCount: number;
};

export type ReferentReportDayRow = {
  dateKey: string;
  label: string;
  totalCashTopUpRsd: number;
  topUpCount: number;
  activationsCount: number;
  extensionsCount: number;
  uniqueStudentsCount: number;
  blocksCount: number;
};

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

function logDateKey(log: ReferentActionLog): string {
  return toDateKey(new Date(log.at));
}

function formatDayLabel(dateKey: string): string {
  return new Intl.DateTimeFormat("sr-RS", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseDateKey(dateKey));
}

function formatShortDayLabel(dateKey: string): string {
  return new Intl.DateTimeFormat("sr-RS", {
    day: "numeric",
    month: "short",
  }).format(parseDateKey(dateKey));
}

function getWeekStartDateKey(referenceDateKey: string): string {
  const date = parseDateKey(referenceDateKey);
  const dayOfWeek = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - dayOfWeek);
  return toDateKey(date);
}

export function getPeriodDateKeys(period: ReportPeriod, referenceDateKey: string): string[] {
  if (period === "day") {
    return [referenceDateKey];
  }

  if (period === "week") {
    const start = getWeekStartDateKey(referenceDateKey);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }

  if (period === "month") {
    const ref = parseDateKey(referenceDateKey);
    const year = ref.getFullYear();
    const month = ref.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, index) =>
      toDateKey(new Date(year, month, index + 1)),
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

export function getPeriodLabel(period: ReportPeriod, referenceDateKey: string): string {
  if (period === "day") {
    return formatDayLabel(referenceDateKey);
  }

  if (period === "week") {
    const keys = getPeriodDateKeys("week", referenceDateKey);
    const start = keys[0];
    const end = keys[keys.length - 1];
    return `${formatShortDayLabel(start)} – ${formatShortDayLabel(end)} ${parseDateKey(end).getFullYear()}.`;
  }

  if (period === "month") {
    return new Intl.DateTimeFormat("sr-RS", {
      month: "long",
      year: "numeric",
    }).format(parseDateKey(referenceDateKey));
  }

  return String(parseDateKey(referenceDateKey).getFullYear());
}

function aggregateLogs(logs: ReferentActionLog[]): Omit<ReferentReportSummary, "period" | "label"> {
  const cardIds = new Set<string>();

  let totalCashTopUpRsd = 0;
  let topUpCount = 0;
  let activationsCount = 0;
  let extensionsCount = 0;
  let blocksCount = 0;

  for (const log of logs) {
    cardIds.add(log.cardId);

    if (log.action === "top_up") {
      topUpCount += 1;
      totalCashTopUpRsd += log.amountRsd ?? 0;
    } else if (log.action === "activate") {
      activationsCount += 1;
    } else if (log.action === "extend") {
      extensionsCount += 1;
    } else if (log.action === "block") {
      blocksCount += 1;
    }
  }

  return {
    totalCashTopUpRsd,
    topUpCount,
    activationsCount,
    extensionsCount,
    uniqueStudentsCount: cardIds.size,
    blocksCount,
  };
}

export function getReferentReport(
  period: ReportPeriod,
  referenceDateKey: string = calendarTodayDateKey,
  actionLogs: ReferentActionLog[] = [],
): ReferentReportSummary {
  const dateKeys = new Set(getPeriodDateKeys(period, referenceDateKey));
  const logs = actionLogs.filter((log) => dateKeys.has(logDateKey(log)));

  return {
    period,
    label: getPeriodLabel(period, referenceDateKey),
    ...aggregateLogs(logs),
  };
}

export function getReferentReportBreakdown(
  period: ReportPeriod,
  referenceDateKey: string = calendarTodayDateKey,
  actionLogs: ReferentActionLog[] = [],
): ReferentReportDayRow[] {
  if (period === "day") {
    return [];
  }

  if (period === "year") {
    const year = parseDateKey(referenceDateKey).getFullYear();
    const monthLabels = [
      "Januar", "Februar", "Mart", "April", "Maj", "Jun",
      "Jul", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar",
    ];
    const rows: ReferentReportDayRow[] = [];
    for (let month = 0; month < 12; month += 1) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const monthKeys: string[] = [];
      for (let day = 1; day <= daysInMonth; day += 1) {
        monthKeys.push(toDateKey(new Date(year, month, day)));
      }
      const monthKeySet = new Set(monthKeys);
      const monthLogs = actionLogs.filter((log) => monthKeySet.has(logDateKey(log)));
      const aggregated = aggregateLogs(monthLogs);
      rows.push({
        dateKey: `${year}-${String(month + 1).padStart(2, "0")}-01`,
        label: `${monthLabels[month]} ${year}`,
        ...aggregated,
      });
    }
    return rows.filter(
      (row) =>
        row.topUpCount > 0 ||
        row.activationsCount > 0 ||
        row.extensionsCount > 0 ||
        row.blocksCount > 0,
    );
  }

  const dateKeys = getPeriodDateKeys(period, referenceDateKey);

  return dateKeys
    .map((dateKey) => {
      const dayLogs = actionLogs.filter((log) => logDateKey(log) === dateKey);
      const aggregated = aggregateLogs(dayLogs);

      return {
        dateKey,
        label: formatShortDayLabel(dateKey),
        ...aggregated,
      };
    })
    .filter(
      (row) =>
        row.topUpCount > 0 ||
        row.activationsCount > 0 ||
        row.extensionsCount > 0 ||
        row.blocksCount > 0,
    );
}
