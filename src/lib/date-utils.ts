import { toDateKey } from "@/lib/calendar-utils";

const APP_NOW_ENV = process.env.NEXT_PUBLIC_APP_NOW?.trim() ?? "";
const APP_DATE_ENV = process.env.NEXT_PUBLIC_APP_DATE?.trim() ?? "";
const STORAGE_KEY = "emenza:app-time-override";

type SessionOverride = {
  anchorRealMs: number;
  anchorOverrideMs: number;
};

let envAnchorRealMs: number | null = null;
let envAnchorOverrideMs: number | null = null;

const listeners = new Set<() => void>();

function notifyAppTimeListeners() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeAppTime(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readSessionOverride(): SessionOverride | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as SessionOverride;
    if (
      typeof parsed.anchorRealMs !== "number" ||
      typeof parsed.anchorOverrideMs !== "number"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeSessionOverride(override: SessionOverride | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (override) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(override));
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  notifyAppTimeListeners();
}

function ensureEnvNowAnchor(realMs: number) {
  if (!APP_NOW_ENV || envAnchorRealMs !== null) {
    return;
  }

  const parsed = Date.parse(APP_NOW_ENV);
  if (!Number.isNaN(parsed)) {
    envAnchorRealMs = realMs;
    envAnchorOverrideMs = parsed;
  }
}

function resolveAnchoredNow(realMs: number, anchor: SessionOverride): Date {
  return new Date(anchor.anchorOverrideMs + (realMs - anchor.anchorRealMs));
}

/**
 * Effective application time. Priority:
 * 1. sessionStorage override (UI)
 * 2. NEXT_PUBLIC_APP_NOW env (ticks from anchor)
 * 3. NEXT_PUBLIC_APP_DATE env (date only, real clock)
 * 4. real clock
 */
export function getAppNow(realNow: Date = new Date()): Date {
  const realMs = realNow.getTime();
  const sessionOverride = readSessionOverride();

  if (sessionOverride) {
    return resolveAnchoredNow(realMs, sessionOverride);
  }

  ensureEnvNowAnchor(realMs);

  if (envAnchorOverrideMs !== null && envAnchorRealMs !== null) {
    return new Date(envAnchorOverrideMs + (realMs - envAnchorRealMs));
  }

  if (APP_DATE_ENV) {
    const parts = APP_DATE_ENV.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (parts) {
      const year = Number(parts[1]);
      const month = Number(parts[2]) - 1;
      const day = Number(parts[3]);
      return new Date(
        year,
        month,
        day,
        realNow.getHours(),
        realNow.getMinutes(),
        realNow.getSeconds(),
        realNow.getMilliseconds(),
      );
    }
  }

  return new Date(realMs);
}

export function setAppTimeOverride(date: Date, realNow: Date = new Date()) {
  writeSessionOverride({
    anchorRealMs: realNow.getTime(),
    anchorOverrideMs: date.getTime(),
  });
}

export function setAppDateTimeFromParts(dateKey: string, time: string) {
  const dateParts = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateParts) {
    return;
  }

  const timeParts = time.split(":");
  const hours = Number(timeParts[0] ?? 0);
  const minutes = Number(timeParts[1] ?? 0);
  const seconds = Number(timeParts[2] ?? 0);

  setAppTimeOverride(
    new Date(
      Number(dateParts[1]),
      Number(dateParts[2]) - 1,
      Number(dateParts[3]),
      hours,
      minutes,
      seconds,
      0,
    ),
  );
}

export function clearAppTimeOverride() {
  writeSessionOverride(null);
}

export function isAppTimeOverridden(): boolean {
  if (readSessionOverride()) {
    return true;
  }

  if (APP_NOW_ENV && !Number.isNaN(Date.parse(APP_NOW_ENV))) {
    return true;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(APP_DATE_ENV);
}

export function isSessionAppTimeOverridden(): boolean {
  return readSessionOverride() !== null;
}

export function getAppTimeOverrideLabel(): string | null {
  if (readSessionOverride()) {
    return "UI";
  }

  if (APP_NOW_ENV && !Number.isNaN(Date.parse(APP_NOW_ENV))) {
    return "APP_NOW";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(APP_DATE_ENV)) {
    return "APP_DATE";
  }

  return null;
}

export function getAppNowIso(now: Date = getAppNow()): string {
  return now.toISOString();
}

export function getAppDateKey(now: Date = getAppNow()): string {
  return toDateKey({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  });
}

/** App time for SSR/hydration — ignores sessionStorage UI override. */
export function getAppNowWithoutSessionOverride(realNow: Date = new Date()): Date {
  const realMs = realNow.getTime();

  ensureEnvNowAnchor(realMs);

  if (envAnchorOverrideMs !== null && envAnchorRealMs !== null) {
    return new Date(envAnchorOverrideMs + (realMs - envAnchorRealMs));
  }

  if (APP_DATE_ENV) {
    const parts = APP_DATE_ENV.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (parts) {
      const year = Number(parts[1]);
      const month = Number(parts[2]) - 1;
      const day = Number(parts[3]);
      return new Date(
        year,
        month,
        day,
        realNow.getHours(),
        realNow.getMinutes(),
        realNow.getSeconds(),
        realNow.getMilliseconds(),
      );
    }
  }

  return new Date(realMs);
}

export function getSsrAlignDateKey(now: Date = getAppNowWithoutSessionOverride()): string {
  return getAppDateKey(now);
}

export function formatAppDate(now: Date = getAppNow()): string {
  return now.toLocaleDateString("sr-RS", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatAppTime(now: Date = getAppNow()): string {
  return now.toLocaleTimeString("sr-RS", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function toDateInputValue(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toTimeInputValue(now: Date): string {
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}
