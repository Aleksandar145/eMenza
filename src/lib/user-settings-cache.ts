import type { SettingsState } from "@/lib/podesavanja-mock";

const SETTINGS_CACHE_PREFIX = "emenza-user-settings-v1";

export function readUserSettingsCache(userId: string): SettingsState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(`${SETTINGS_CACHE_PREFIX}:${userId}`);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as SettingsState;
  } catch {
    return null;
  }
}

export function writeUserSettingsCache(userId: string, settings: SettingsState) {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(`${SETTINGS_CACHE_PREFIX}:${userId}`, JSON.stringify(settings));
}

export function clearUserSettingsCache(userId?: string) {
  if (typeof window === "undefined" || !userId) {
    return;
  }

  sessionStorage.removeItem(`${SETTINGS_CACHE_PREFIX}:${userId}`);
}
