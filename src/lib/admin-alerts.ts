import {
  SCHEDULE_ALERT_LOOKAHEAD_DAYS,
  SUSPICIOUS_TOP_UP_THRESHOLD_RSD,
  UNRESOLVED_COMPLAINT_AGE_HOURS,
} from "@/lib/system-alerts-config";
import { HIGH_TOP_UP_THRESHOLD } from "@/lib/top-up-limits";
import type { MealType } from "@/lib/meal-types";
import type { DailyMenuEntry } from "@/lib/kuhinja-mock";
import type { ReferentActionLog } from "@/lib/referent-cards-mock";
import type { ComplaintEntry, FeedbackEntry, PublishedNotice } from "@/lib/admin-system-mock";
import { parseDateKey, addDays, toDateKey } from "@/lib/calendar-utils";

export type AlertSeverity = "critical" | "warning";

export type SystemAlert = {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  actionLabel: string;
  href: string;
  /** ISO vremenska oznaka događaja — koristi se za sortiranje (najnovije na vrhu). */
  at: string;
};

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Doručak",
  lunch: "Ručak",
  dinner: "Večera",
};

const A_SCHEDULE_HREF = "/admin/raspored";
const B_TOP_UP_HREF = "/admin/finansije";
const C_COMPLAINTS_HREF = "/admin/zalbe";
const D_STAFF_HREF = "/admin/zaposleni";

const MAX_TOP_UP_ALERTS = 5;

function formatDateKeyLabel(dateKey: string): string {
  const parsed = parseDateKey(dateKey);
  if (!parsed) {
    return dateKey;
  }
  const [year, month, day] = [parsed.year, parsed.month, parsed.day];
  return `${day}.${month}.${year}.`;
}

function isOlderThanHours(iso: string, hours: number, now: number): boolean {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) {
    return false;
  }
  return now - time > hours * 60 * 60 * 1000;
}

export type SystemAlertsInput = {
  todayDateKey: string;
  now?: number;
  menus: DailyMenuEntry[];
  topUpLogs: ReferentActionLog[];
  complaints: ComplaintEntry[];
  feedback: FeedbackEntry[];
  publishedNotices?: PublishedNotice[];
};

function buildScheduleAlerts(input: SystemAlertsInput): SystemAlert[] {
  const alerts: SystemAlert[] = [];
  const anchor = input.todayDateKey;
  const parsedAnchor = parseDateKey(anchor);
  if (!parsedAnchor) {
    return alerts;
  }

  for (let offset = 0; offset < SCHEDULE_ALERT_LOOKAHEAD_DAYS; offset += 1) {
    const dateKey = toDateKey(addDays(parsedAnchor, offset));
    const publishedMeals = new Set(
      input.menus
        .filter((menu) => menu.dateKey === dateKey && menu.published)
        .map((menu) => menu.mealType),
    );
    const missing = MEAL_TYPES.filter((mealType) => !publishedMeals.has(mealType));

    if (missing.length === 0) {
      continue;
    }

    const dayLabel = formatDateKeyLabel(dateKey);
    alerts.push({
      id: `schedule:${dateKey}`,
      severity: "critical",
      title: `Raspored nedostaje (${dayLabel})`,
      message: `Nedostaje: ${missing
        .map((mealType) => MEAL_LABELS[mealType])
        .join(", ")}.`,
      actionLabel: "Kreiraj raspored",
      href: A_SCHEDULE_HREF,
      at: `${dateKey}T12:00:00.000Z`,
    });
  }

  return alerts;
}

function buildTopUpAlerts(input: SystemAlertsInput): SystemAlert[] {
  const suspicious = input.topUpLogs
    .filter(
      (log) =>
        log.action === "top_up" &&
        !log.reversed &&
        (log.amountRsd ?? 0) > SUSPICIOUS_TOP_UP_THRESHOLD_RSD,
    )
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, MAX_TOP_UP_ALERTS);

  return suspicious.map((log) => ({
    id: `topup:${log.id}`,
    severity: "warning",
    title: "Sumnjivo velika gotovinska uplata",
    message: `${formatRsd(log.amountRsd ?? 0)} RSD (limit ${HIGH_TOP_UP_THRESHOLD} RSD) — ${log.referentName}.`,
    actionLabel: "Pregledaj uplate",
    href: B_TOP_UP_HREF,
    at: log.at,
  }));
}

function formatRsd(value: number): string {
  return new Intl.NumberFormat("sr-RS").format(value);
}

function buildComplaintAlerts(input: SystemAlertsInput): SystemAlert[] {
  const now = input.now ?? Date.now();
  const openComplaints = input.complaints.filter(
    (entry) =>
      entry.status !== "reseno" && isOlderThanHours(entry.submittedAt, UNRESOLVED_COMPLAINT_AGE_HOURS, now),
  );
  const unreviewedFeedback = input.feedback.filter(
    (entry) =>
      !entry.reviewed && isOlderThanHours(entry.submittedAt, UNRESOLVED_COMPLAINT_AGE_HOURS, now),
  );

  const alerts: SystemAlert[] = [];

  if (openComplaints.length > 0) {
    const latestAt = latestIso(openComplaints.map((entry) => entry.submittedAt));
    alerts.push({
      id: `complaints:unresolved:${openComplaints.length}:${latestAt}`,
      severity: "warning",
      title: "Nerešene žalbe",
      message: `${openComplaints.length} žalba${formatPlural(openComplaints.length)} starija od ${UNRESOLVED_COMPLAINT_AGE_HOURS}h nije rešena.`,
      actionLabel: "Pregledaj žalbe",
      href: C_COMPLAINTS_HREF,
      at: latestAt,
    });
  }

  if (unreviewedFeedback.length > 0) {
    const latestAt = latestIso(unreviewedFeedback.map((entry) => entry.submittedAt));
    alerts.push({
      id: `feedback:unreviewed:${unreviewedFeedback.length}:${latestAt}`,
      severity: "warning",
      title: "Nepregledane povratne informacije",
      message: `${unreviewedFeedback.length} povratna informacija${formatPlural(unreviewedFeedback.length)} starija od ${UNRESOLVED_COMPLAINT_AGE_HOURS}h nije pregledana.`,
      actionLabel: "Pregledaj utiske",
      href: C_COMPLAINTS_HREF,
      at: latestAt,
    });
  }

  return alerts;
}

function latestIso(values: string[]): string {
  return values
    .filter((value) => !Number.isNaN(new Date(value).getTime()))
    .sort()
    .at(-1) ?? new Date(0).toISOString();
}

function formatPlural(count: number): string {
  if (count % 10 === 1 && count % 100 !== 11) {
    return "";
  }
  if (
    count % 10 >= 2 &&
    count % 10 <= 4 &&
    (count % 100 < 12 || count % 100 > 14)
  ) {
    return "e";
  }
  return "a";
}

function buildNoticeAlerts(input: SystemAlertsInput): SystemAlert[] {
  const notices = (input.publishedNotices ?? []).filter(
    (notice) =>
      !notice.archived &&
      notice.priority === "important" &&
      notice.target.includes("admin"),
  );

  return notices.map((notice) => ({
    id: `notice:${notice.id}`,
    severity: "warning",
    title: notice.title,
    message: notice.message,
    actionLabel: notice.actionLabel ?? "Pogledaj",
    href: notice.actionHref ?? D_STAFF_HREF,
    at: notice.publishedAt,
  }));
}

export function getSystemAlerts(input: SystemAlertsInput): SystemAlert[] {
  return [
    ...buildScheduleAlerts(input),
    ...buildTopUpAlerts(input),
    ...buildComplaintAlerts(input),
    ...buildNoticeAlerts(input),
  ].sort((a, b) => b.at.localeCompare(a.at));
}

export function countSystemAlerts(input: SystemAlertsInput): number {
  return getSystemAlerts(input).length;
}
