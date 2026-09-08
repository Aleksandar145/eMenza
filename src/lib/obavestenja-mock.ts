import { calendarTodayDateKey } from "@/lib/dashboard-mock";
import { getAppDateKey, getAppNow } from "@/lib/date-utils";
import { getFastingOptInPrompt, type FastingOptInPrompt, type FastingPreferences } from "@/lib/fasting-preferences";
import { isInRamadan, isInVelikiPost, isOrthodoxWednesdayOrFriday } from "@/lib/liturgical-calendar";
import type { NotificationSettings, ProfileSettings } from "@/lib/podesavanja-mock";
import { getRezervacijeHref } from "@/lib/rezervacije-mock";

export type NotificationCategory =
  | "reservation"
  | "payment"
  | "menu"
  | "system"
  | "administration"
  | "religion";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  category: NotificationCategory;
  read: boolean;
  actionLabel?: string;
  actionHref?: string;
  priority?: "info" | "important";
  displayMode?: "standard" | "popup";
  /** Epoch ms for inbox ordering (newest first). */
  sortAt?: number;
};

export function sortNotificationsByNewest(items: NotificationItem[]): NotificationItem[] {
  return [...items].sort((a, b) => (b.sortAt ?? 0) - (a.sortAt ?? 0));
}

export function mockSortAtMinutesAgo(minutes: number): number {
  return getAppNow().getTime() - minutes * 60_000;
}

function mockSortAtTodayTime(hours: number, minutes: number): number {
  const date = new Date(getAppNow());
  date.setHours(hours, minutes, 0, 0);
  return date.getTime();
}

const MOCK_SORT_OFFSET_MINUTES: Record<string, number> = {
  n1: 5,
  n2: 120,
  n4: 30 * 60,
  n5: 34 * 60,
  n6: 2 * 24 * 60,
  n7: 12 * 24 * 60,
  n9: 24 * 60,
};

function withMockSortAt(item: NotificationItem): NotificationItem {
  if (item.sortAt !== undefined) {
    return item;
  }

  const offsetMinutes = MOCK_SORT_OFFSET_MINUTES[item.id];
  if (offsetMinutes !== undefined) {
    return { ...item, sortAt: mockSortAtMinutesAgo(offsetMinutes) };
  }

  return item;
}

export const baseNotifications: NotificationItem[] = [
  {
    id: "n1",
    title: "Rezervacija potvrđena",
    message: "Uspešno ste rezervisali iftar (večera) za 4. mart 2026.",
    time: "Pre 5 minuta",
    category: "reservation",
    read: false,
  },
  {
    id: "n2",
    title: "Uplata uspešna",
    message: "Vaša kartica je dopunjena sa 2.500 RSD. Novo stanje: 6.556 RSD.",
    time: "Pre 2 sata",
    category: "payment",
    read: false,
  },
  {
    id: "n4",
    title: "Novi meni za ponedeljak",
    message: "Pogledajte ažurirani meni za 27. februar — dodata je posna varijanta pasulja.",
    time: "Juče, 18:30",
    category: "menu",
    read: true,
  },
  {
    id: "n5",
    title: "Uplata u obradi",
    message: "Uplata za večeru 23. februara se još obrađuje. Obavestićemo vas čim bude završena.",
    time: "Juče, 14:20",
    category: "payment",
    read: true,
  },
  {
    id: "n6",
    title: "Radno vreme restorana",
    message: "Subotom restoran radi do 15:00 zbog planiranog održavanja kuhinje.",
    time: "3. mart 2026.",
    category: "administration",
    read: true,
  },
  {
    id: "n7",
    title: "Rezervacija otkazana",
    message: "Večera za 21. februar je otkazana u skladu sa pravilom otkazivanja 24h unapred.",
    time: "20. februar 2026.",
    category: "reservation",
    read: true,
  },
  {
    id: "n9",
    title: "Obaveštenje administracije",
    message:
      "Od 1. marta važi novo pravilo prijave gostiju u restoran. Detalje pročitajte u studentskom portalu.",
    time: "Pre 1 dan",
    category: "administration",
    read: false,
  },
];

function buildPreFastingOptInNotification(prompt: FastingOptInPrompt): NotificationItem {
  const periodTitle =
    prompt.period === "veliki_post" ? "Uskoro počinje Veliki post" : "Uskoro počinje ramazan";

  return {
    id: prompt.period === "veliki_post" ? "r-post-optin" : "r-ramadan-optin",
    title: prompt.daysUntilStart > 0 ? periodTitle : prompt.title,
    message: prompt.message,
    time: "Danas, 09:00",
    category: "religion",
    read: false,
    actionLabel: "Izjasni se",
    actionHref: "/",
    sortAt: mockSortAtTodayTime(9, 0),
  };
}

const religionNotificationSeeds: NotificationItem[] = [
  {
    id: "r-post-1",
    title: "Veliki post — posni meni",
    message:
      "Danas je posni dan u Velikom postu. U menzi su dostupna posna jela za ručak i večeru — pogledajte današnji meni.",
    time: "Danas, 07:30",
    category: "religion",
    read: false,
    actionLabel: "Rezerviši posno",
    actionHref: getRezervacijeHref({ dateKey: calendarTodayDateKey, obrok: "lunch" }),
  },
  {
    id: "r-post-2",
    title: "Posna sreda / petak",
    message:
      "Danas je posna sreda ili petak. U menzi su dostupna posna jela — pogledajte današnji meni i rezervišite unapred.",
    time: "Danas, 07:30",
    category: "religion",
    read: false,
    actionLabel: "Rezerviši posno",
    actionHref: getRezervacijeHref({ dateKey: calendarTodayDateKey, obrok: "lunch" }),
  },
  {
    id: "r-ramadan-1",
    title: "Ramazan — prijava posnog menija",
    message:
      "Otvorena je prijava za posni meni u ramazanu. Rezervišite unapred da osigurate obrok posle iftara.",
    time: "Danas, 08:00",
    category: "religion",
    read: false,
    actionLabel: "Prijavi se za meni",
    actionHref: getRezervacijeHref({ dateKey: calendarTodayDateKey, obrok: "dinner" }),
  },
  {
    id: "r-ramadan-2",
    title: "Ramazan — opcija „poneti“ obrok",
    message:
      "Za iftar možete rezervisati posni obrok sa opcijom preuzimanja na šalteru („poneti“). Kliknite da odmah rezervišete večeru.",
    time: "Danas, 16:00",
    category: "religion",
    read: false,
    actionLabel: "Rezerviši „poneti“",
    actionHref: getRezervacijeHref({ dateKey: calendarTodayDateKey, obrok: "dinner" }),
  },
];

export function buildNotificationsForUser(
  profile: ProfileSettings,
  notifications: NotificationSettings,
  fasting: FastingPreferences,
  options?: { includeBaseSeeds?: boolean; dateKey?: string },
): NotificationItem[] {
  const todayDateKey = options?.dateKey ?? getAppDateKey(getAppNow());
  const islamOnlyBaseNotificationIds = new Set(["n1"]);
  const seededBaseNotifications =
    options?.includeBaseSeeds === false
      ? []
      : profile.religion === "islam"
        ? [...baseNotifications]
        : baseNotifications.filter((item) => !islamOnlyBaseNotificationIds.has(item.id));
  const items = seededBaseNotifications.map(withMockSortAt);
  const optInPrompt = getFastingOptInPrompt(
    profile.religion,
    todayDateKey,
    fasting,
  );

  if (optInPrompt) {
    items.unshift(buildPreFastingOptInNotification(optInPrompt));
  }

  if (profile.religion === "hristijanstvo") {
    if (
      notifications.christianFastingMenuReminders &&
      isInVelikiPost(todayDateKey) &&
      fasting.velikiPost2026 === "postim"
    ) {
      items.unshift({
        ...religionNotificationSeeds[0],
        sortAt: mockSortAtTodayTime(7, 30),
      });
    }
    if (
      notifications.christianDailyPosnoAlerts &&
      !isInVelikiPost(todayDateKey) &&
      isOrthodoxWednesdayOrFriday(todayDateKey) &&
      fasting.sredaPetak === "postim"
    ) {
      items.unshift({
        ...religionNotificationSeeds[1],
        actionHref: getRezervacijeHref({ dateKey: todayDateKey, obrok: "lunch" }),
        sortAt: mockSortAtTodayTime(7, 30),
      });
    }
  }

  if (profile.religion === "islam" && fasting.ramazan2026 === "postim") {
    if (notifications.islamRamadanMenuSignup && isInRamadan(todayDateKey)) {
      items.unshift({
        ...religionNotificationSeeds[2],
        sortAt: mockSortAtTodayTime(8, 0),
      });
    }
    if (notifications.islamTakeawayReminder && isInRamadan(todayDateKey)) {
      items.unshift({
        ...religionNotificationSeeds[3],
        sortAt: mockSortAtTodayTime(16, 0),
      });
    }
  }

  return items;
}

/** @deprecated Koristi buildNotificationsForUser */
export const notifications = buildNotificationsForUser(
  { religion: "islam" } as ProfileSettings,
  {
    islamRamadanMenuSignup: true,
    islamTakeawayReminder: true,
  } as NotificationSettings,
  { sredaPetak: null, velikiPost2026: null, ramazan2026: "postim" },
);

export function getUnreadCount(items: NotificationItem[]) {
  return items.filter((item) => !item.read).length;
}

export function getCategoryLabel(category: NotificationCategory) {
  switch (category) {
    case "reservation":
      return "Rezervacije";
    case "payment":
      return "Plaćanja";
    case "menu":
      return "Meni";
    case "system":
      return "Sistem";
    case "administration":
      return "Administracija";
    case "religion":
      return "Vera / meni";
  }
}
