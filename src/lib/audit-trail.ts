import { AUDIT_WINDOW_HOURS } from "@/lib/audit-trail-config";
import type { AdminAuditRecord } from "@/lib/audit-trail-store";

export type AuditKind =
  | "notice"
  | "working_hours"
  | "reservation"
  | "prices"
  | "staff"
  | "reversal"
  | "card"
  | "other";

export type AuditEntry = {
  id: string;
  kind: AuditKind;
  actionType: string;
  author: string;
  role: string | null;
  message: string;
  /** ISO vremenska oznaka događaja. */
  at: string;
  href: string;
};

export type AuditTrailInput = {
  now: number;
  windowHours?: number;
  records: AdminAuditRecord[];
};

const A_LOGS_HREF = "/admin/logs";

function withinWindow(at: string, now: number, windowHours: number): boolean {
  const time = new Date(at).getTime();
  if (Number.isNaN(time)) {
    return false;
  }
  return now - time <= windowHours * 60 * 60 * 1000;
}

export function getAuditEntries(input: AuditTrailInput): AuditEntry[] {
  const windowHours = input.windowHours ?? AUDIT_WINDOW_HOURS;
  return input.records
    .filter((record) => withinWindow(record.at, input.now, windowHours))
    .map((record) => ({
      id: record.id,
      kind: record.kind,
      actionType: record.actionType,
      author: record.author,
      role: record.role,
      message: record.message,
      at: record.at,
      href: A_LOGS_HREF,
    }))
    .sort((a, b) => b.at.localeCompare(a.at));
}

export function formatAuditRelativeTime(now: number, at: string): string {
  const time = new Date(at).getTime();
  if (Number.isNaN(time)) {
    return "";
  }
  const diffMs = now - time;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) {
    return "upravo sada";
  }
  if (minutes < 60) {
    return `pre ${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `pre ${hours} h`;
  }
  const days = Math.floor(hours / 24);
  return `pre ${days} d`;
}
