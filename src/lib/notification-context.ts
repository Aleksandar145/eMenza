import { addDays, parseDateKey, toDateKey } from "@/lib/calendar-utils";
import { formatCalendarDayLabel } from "@/lib/dashboard-mock";
import { getAppDateKey } from "@/lib/date-utils";
import type { AppLanguage } from "@/i18n/types";
import { getMessages } from "@/i18n/messages";
import { getMealTypeLabel } from "@/i18n/catalog";
import { resolveMessage } from "@/i18n/translate";
import {
  canBookMealSlot,
  formatReservationBookByLabel,
} from "@/lib/meal-booking-window";
import type { NotificationItem } from "@/lib/obavestenja-mock";
import type { NotificationSettings } from "@/lib/podesavanja-mock";
import { reminderTimeToMealType } from "@/lib/notification-preferences";
import type { CardStatus } from "@/lib/referent-cards-mock";
import { buildMealDetailsForDay } from "@/lib/reservations-view";
import { getRezervacijeHref } from "@/lib/rezervacije-mock";
import type { ReservationRecord } from "@/server/repositories/reservations";

const SCAN_DAYS_AHEAD = 7;

function addDaysToDateKey(dateKey: string, days: number): string {
  const parsed = parseDateKey(dateKey);
  if (!parsed) {
    return dateKey;
  }

  return toDateKey(addDays(parsed, days));
}

function isReminderTimeReached(
  reminderTime: NotificationSettings["reminderTime"],
  now: Date,
): boolean {
  const [hours, minutes] = reminderTime.split(":").map(Number);
  const reminderMinutes = hours * 60 + minutes;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= reminderMinutes;
}

function resolveContextMessage(language: AppLanguage, key: string, values?: Record<string, string | number>) {
  return resolveMessage(getMessages(language), `settings.notifications.context.${key}`, values);
}

export function buildReservationReminderNotification(
  settings: NotificationSettings,
  reservations: ReservationRecord[],
  options?: { now?: Date; dateKey?: string; language?: AppLanguage },
): NotificationItem | null {
  if (!settings.reservationReminder) {
    return null;
  }

  const now = options?.now ?? new Date();
  const todayDateKey = options?.dateKey ?? getAppDateKey(now);
  const language = options?.language ?? "sr";

  if (!isReminderTimeReached(settings.reminderTime, now)) {
    return null;
  }

  const mealType = reminderTimeToMealType(settings.reminderTime);

  for (let offset = 0; offset <= SCAN_DAYS_AHEAD; offset += 1) {
    const dateKey = addDaysToDateKey(todayDateKey, offset);
    const day = buildMealDetailsForDay(dateKey, reservations);
    const section = day.sections.find((entry) => entry.type === mealType);

    if (!section || !canBookMealSlot(dateKey, mealType, section.status, now)) {
      continue;
    }

    const remainingLabel = formatReservationBookByLabel(dateKey, mealType, section.status, now);
    if (!remainingLabel) {
      continue;
    }

    const mealLabel = getMealTypeLabel(language, mealType);
    const dateLabel = formatCalendarDayLabel(dateKey);

    const [reminderHours, reminderMinutes] = settings.reminderTime.split(":").map(Number);
    const sortAt = new Date(now);
    sortAt.setHours(reminderHours, reminderMinutes, 0, 0);

    return {
      id: `ctx-reservation-${dateKey}-${mealType}`,
      title: resolveContextMessage(language, "reservationReminderTitle"),
      message: resolveContextMessage(language, "reservationReminderMessage", {
        meal: mealLabel,
        date: dateLabel,
        remaining: remainingLabel,
      }),
      time: resolveContextMessage(language, "todayAtReminderTime", {
        time: settings.reminderTime,
      }),
      category: "reservation",
      read: false,
      actionLabel: resolveContextMessage(language, "reserveAction"),
      actionHref: getRezervacijeHref({ dateKey, obrok: mealType }),
      sortAt: sortAt.getTime(),
    };
  }

  return null;
}

export function buildWelcomeNotification(
  firstName: string,
  cardStatus: CardStatus,
  options?: { language?: AppLanguage; now?: Date },
): NotificationItem | null {
  if (cardStatus !== "pending_verification") {
    return null;
  }

  const language = options?.language ?? "sr";
  const now = options?.now ?? new Date();
  const name = firstName.trim() || resolveContextMessage(language, "welcomeFallbackName");
  const hours = resolveMessage(getMessages(language), "card.referentHoursPeriod");

  return {
    id: "ctx-welcome",
    title: resolveContextMessage(language, "welcomeTitle", { name }),
    message: resolveContextMessage(language, "welcomeMessage", { hours }),
    time: resolveContextMessage(language, "welcomeTime"),
    category: "administration",
    read: false,
    sortAt: now.getTime(),
  };
}

export function buildContextualNotifications(input: {
  settings: NotificationSettings;
  reservations: ReservationRecord[];
  cardStatus: CardStatus;
  firstName: string;
  now?: Date;
  dateKey?: string;
  language?: AppLanguage;
}): NotificationItem[] {
  const now = input.now ?? new Date();
  const items: NotificationItem[] = [];

  const reservationReminder = buildReservationReminderNotification(
    input.settings,
    input.reservations,
    {
      now,
      dateKey: input.dateKey,
      language: input.language,
    },
  );

  if (reservationReminder) {
    items.push(reservationReminder);
  }

  const welcome = buildWelcomeNotification(input.firstName, input.cardStatus, {
    language: input.language,
    now,
  });

  if (welcome) {
    items.unshift(welcome);
  }

  return items;
}
