import type { NotificationCategory, NotificationItem } from "@/lib/obavestenja-mock";

export const STUDENT_NOTIFICATIONS_STORAGE_KEY = "emenza-student-notifications";

export type DynamicStudentNotification = {
  id: string;
  title: string;
  message: string;
  time: string;
  category: NotificationCategory;
  read: boolean;
  email?: string;
  createdAt?: string;
  sortAt?: number;
};

type StoredNotifications = {
  items: DynamicStudentNotification[];
};

function loadStored(): DynamicStudentNotification[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(STUDENT_NOTIFICATIONS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as StoredNotifications;
    return parsed.items ?? [];
  } catch {
    return [];
  }
}

function saveStored(items: DynamicStudentNotification[]) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(STUDENT_NOTIFICATIONS_STORAGE_KEY, JSON.stringify({ items }));
}

function resolveDynamicSortAt(item: DynamicStudentNotification): number {
  if (item.sortAt !== undefined) {
    return item.sortAt;
  }

  if (item.createdAt) {
    return new Date(item.createdAt).getTime();
  }

  const match = item.id.match(/^dyn-(\d+)-/);
  if (match) {
    return Number(match[1]);
  }

  return 0;
}

function toNotificationItem(item: DynamicStudentNotification): NotificationItem {
  return {
    id: item.id,
    title: item.title,
    message: item.message,
    time: item.time,
    category: item.category,
    read: item.read,
    sortAt: resolveDynamicSortAt(item),
  };
}

export function appendStudentNotification(input: {
  title: string;
  message: string;
  category: NotificationCategory;
  email?: string;
}) {
  const items = loadStored();
  const createdAt = new Date().toISOString();
  const notification: DynamicStudentNotification = {
    id: `dyn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: input.title,
    message: input.message,
    time: "Upravo sada",
    category: input.category,
    read: false,
    email: input.email,
    createdAt,
    sortAt: new Date(createdAt).getTime(),
  };

  saveStored([notification, ...items]);
  return notification;
}

export function getDynamicStudentNotifications(studentEmail?: string): NotificationItem[] {
  const items = loadStored();

  const filtered = !studentEmail
    ? items
    : items.filter((item) => !item.email || item.email === studentEmail);

  return filtered.map(toNotificationItem);
}
