import type { DishCatalogState } from "@/lib/dish-catalog-mock";
import type { KuhinjaJelovnikState } from "@/lib/kuhinja-mock";
import type { StudentCard } from "@/lib/referent-cards-mock";
import type { ReservationRecord } from "@/server/repositories/reservations";
import type { StudentNotificationRecord } from "@/server/repositories/notifications";

const CARD_CACHE_PREFIX = "emenza-student-card";
const RESERVATIONS_CACHE_PREFIX = "emenza-student-reservations";
const NOTIFICATIONS_CACHE_PREFIX = "emenza-student-notifications";
const JELOVNIK_CACHE_KEY = "emenza-student-jelovnik";
const DISH_CATALOG_CACHE_KEY = "emenza-student-dish-catalog";

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  if (value === null) {
    sessionStorage.removeItem(key);
    return;
  }

  sessionStorage.setItem(key, JSON.stringify(value));
}

export function readStudentCardCache(userId: string): StudentCard | null {
  return readJson<StudentCard>(`${CARD_CACHE_PREFIX}:${userId}`);
}

export function writeStudentCardCache(userId: string, card: StudentCard | null) {
  writeJson(`${CARD_CACHE_PREFIX}:${userId}`, card);
}

export function readReservationsCache(userId: string): ReservationRecord[] | null {
  return readJson<ReservationRecord[]>(`${RESERVATIONS_CACHE_PREFIX}:${userId}`);
}

export function writeReservationsCache(userId: string, reservations: ReservationRecord[]) {
  writeJson(`${RESERVATIONS_CACHE_PREFIX}:${userId}`, reservations);
}

export function readNotificationsCache(userId: string): StudentNotificationRecord[] | null {
  return readJson<StudentNotificationRecord[]>(`${NOTIFICATIONS_CACHE_PREFIX}:${userId}`);
}

export function writeNotificationsCache(userId: string, notifications: StudentNotificationRecord[]) {
  writeJson(`${NOTIFICATIONS_CACHE_PREFIX}:${userId}`, notifications);
}

export function readJelovnikCache(): KuhinjaJelovnikState | null {
  return readJson<KuhinjaJelovnikState>(JELOVNIK_CACHE_KEY);
}

export function writeJelovnikCache(state: KuhinjaJelovnikState) {
  writeJson(JELOVNIK_CACHE_KEY, state);
}

export function readDishCatalogCache(): DishCatalogState | null {
  return readJson<DishCatalogState>(DISH_CATALOG_CACHE_KEY);
}

export function writeDishCatalogCache(state: DishCatalogState) {
  writeJson(DISH_CATALOG_CACHE_KEY, state);
}

export function clearStudentRemoteCache(userId?: string) {
  if (typeof window === "undefined") {
    return;
  }

  if (userId) {
    sessionStorage.removeItem(`${CARD_CACHE_PREFIX}:${userId}`);
    sessionStorage.removeItem(`${RESERVATIONS_CACHE_PREFIX}:${userId}`);
    sessionStorage.removeItem(`${NOTIFICATIONS_CACHE_PREFIX}:${userId}`);
    return;
  }

  sessionStorage.removeItem(JELOVNIK_CACHE_KEY);
  sessionStorage.removeItem(DISH_CATALOG_CACHE_KEY);

  for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = sessionStorage.key(index);
    if (
      key?.startsWith(`${CARD_CACHE_PREFIX}:`) ||
      key?.startsWith(`${RESERVATIONS_CACHE_PREFIX}:`) ||
      key?.startsWith(`${NOTIFICATIONS_CACHE_PREFIX}:`)
    ) {
      sessionStorage.removeItem(key);
    }
  }
}
