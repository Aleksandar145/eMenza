import { toDateKey } from "@/lib/calendar-utils";

export function isAppTimeOverrideAllowed() {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.ALLOW_APP_TIME_OVERRIDE === "true"
  );
}

export function getRequestAppNow(request: Request, fallback: Date = new Date()): Date {
  if (!isAppTimeOverrideAllowed()) {
    return fallback;
  }

  const header = request.headers.get("X-App-Now");
  if (!header) {
    return fallback;
  }

  const parsed = Date.parse(header);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return new Date(parsed);
}

export function getRequestTodayDateKey(request: Request, fallback: Date = new Date()): string {
  const now = getRequestAppNow(request, fallback);
  return toDateKey({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  });
}
