const READ_STATE_PREFIX = "emenza-notification-read";

type StoredReadState = {
  ids: string[];
};

function storageKey(userKey: string) {
  return `${READ_STATE_PREFIX}:${userKey}`;
}

function loadIds(userKey: string): string[] {
  if (typeof window === "undefined" || !userKey) {
    return [];
  }

  try {
    const raw = localStorage.getItem(storageKey(userKey));
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as StoredReadState;
    return Array.isArray(parsed.ids) ? parsed.ids : [];
  } catch {
    return [];
  }
}

function saveIds(userKey: string, ids: string[]) {
  if (typeof window === "undefined" || !userKey) {
    return;
  }

  const unique = [...new Set(ids)];
  localStorage.setItem(storageKey(userKey), JSON.stringify({ ids: unique } satisfies StoredReadState));
}

export function getReadNotificationIds(userKey: string): Set<string> {
  return new Set(loadIds(userKey));
}

export function markNotificationRead(userKey: string, id: string) {
  if (!userKey || !id) {
    return;
  }

  const ids = loadIds(userKey);
  if (ids.includes(id)) {
    return;
  }

  saveIds(userKey, [...ids, id]);
}

export function markAllNotificationsRead(userKey: string, notificationIds: string[]) {
  if (!userKey || notificationIds.length === 0) {
    return;
  }

  saveIds(userKey, [...loadIds(userKey), ...notificationIds]);
}
