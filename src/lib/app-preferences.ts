import type { AppSettings } from "@/lib/podesavanja-mock";
import { loadUserSettings } from "@/lib/user-settings-store";
import { readUserSettingsCache } from "@/lib/user-settings-cache";

export const LANDING_PREF_APPLY_KEY = "emenza-apply-landing-pref";
const APP_PREFS_BACKUP_PREFIX = "emenza-app-prefs:";

export const defaultLandingPageOptions: {
  value: AppSettings["defaultLandingPage"];
  label: string;
  description: string;
}[] = [
  {
    value: "dashboard",
    label: "Početna",
    description: "Pregled dana, kartica i kalendara.",
  },
  {
    value: "rezervacije",
    label: "Moje rezervacije",
    description: "Planiranje i upravljanje obrocima.",
  },
];

export function normalizeAppSettings(app: Partial<AppSettings> | undefined): AppSettings {
  return {
    language: app?.language === "en" ? "en" : "sr",
    defaultLandingPage: app?.defaultLandingPage === "rezervacije" ? "rezervacije" : "dashboard",
  };
}

export function markLandingPrefForApply() {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(LANDING_PREF_APPLY_KEY, "1");
}

export function hasLandingPrefApplyFlag() {
  if (typeof window === "undefined") {
    return false;
  }

  return sessionStorage.getItem(LANDING_PREF_APPLY_KEY) === "1";
}

export function consumeLandingPrefApplyFlag() {
  if (typeof window === "undefined") {
    return false;
  }

  const shouldApply = sessionStorage.getItem(LANDING_PREF_APPLY_KEY) === "1";
  if (shouldApply) {
    sessionStorage.removeItem(LANDING_PREF_APPLY_KEY);
  }

  return shouldApply;
}

export function writeAppSettingsBackup(userId: string, app: AppSettings) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(
    `${APP_PREFS_BACKUP_PREFIX}${userId}`,
    JSON.stringify(normalizeAppSettings(app)),
  );
}

export function readAppSettingsBackup(userId: string): AppSettings | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(`${APP_PREFS_BACKUP_PREFIX}${userId}`);
    if (!raw) {
      return null;
    }

    return normalizeAppSettings(JSON.parse(raw) as Partial<AppSettings>);
  } catch {
    return null;
  }
}

export function shouldHonorLoginRedirectNext(nextParam: string | null | undefined): boolean {
  if (!nextParam?.startsWith("/") || nextParam.startsWith("//")) {
    return false;
  }

  // Generički povratak na početnu ne sme da pregazi izbor u podešavanjima.
  return nextParam !== "/";
}

export function getAppSettingsForUser(userId?: string | null): AppSettings {
  if (userId) {
    const cached = readUserSettingsCache(userId);
    if (cached) {
      return normalizeAppSettings(cached.app);
    }

    const backup = readAppSettingsBackup(userId);
    if (backup) {
      return backup;
    }
  }

  return normalizeAppSettings(loadUserSettings().app);
}

export function resolveStudentLandingPathSync(options: {
  userId?: string | null;
  nextParam?: string | null;
}): string {
  const { userId, nextParam = null } = options;

  if (shouldHonorLoginRedirectNext(nextParam)) {
    return nextParam!;
  }

  return resolveDefaultLandingPath(getAppSettingsForUser(userId));
}

/** @deprecated Koristi resolveStudentLandingPathSync — landing ne sme sam fetchovati API. */
export async function resolveStudentLandingPath(options: {
  userId?: string | null;
  nextParam?: string | null;
}): Promise<string> {
  return resolveStudentLandingPathSync(options);
}

export function resolveDefaultLandingPath(app: AppSettings): string {
  return app.defaultLandingPage === "rezervacije" ? "/rezervacije" : "/";
}

export function resolvePostLoginPath(nextParam: string | null, app: AppSettings): string {
  if (shouldHonorLoginRedirectNext(nextParam)) {
    return nextParam!;
  }

  return resolveDefaultLandingPath(app);
}
