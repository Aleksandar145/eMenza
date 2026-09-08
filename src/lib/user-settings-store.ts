import {
  FASTING_CONFIG_VERSION,
  migrateFastingPreferences,
} from "@/lib/fasting-preferences";
import { normalizeAppSettings } from "@/lib/app-preferences";
import {
  cloneSettingsState,
  initialSettingsState,
  type SettingsState,
} from "@/lib/podesavanja-mock";
import type { RegisterDraft } from "@/lib/register-mock";
import { createCardFromRegistration } from "@/lib/referent-cards-store";

export const USER_SETTINGS_STORAGE_KEY = "emenza-user-settings";

/** Povećaj kada mock demo (datum, vera, post) promeni podrazumevane vrednosti. */
export const USER_SETTINGS_DEMO_VERSION = 5;

type StoredSettings = SettingsState & { demoVersion?: number };

function withDemoVersion(state: SettingsState): StoredSettings {
  return { ...state, demoVersion: USER_SETTINGS_DEMO_VERSION };
}

export function loadUserSettings(): SettingsState {
  if (typeof window === "undefined") {
    return cloneSettingsState(initialSettingsState);
  }

  try {
    const raw = localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return cloneSettingsState(initialSettingsState);
    }

    const parsed = JSON.parse(raw) as Partial<StoredSettings>;

    if (parsed.demoVersion !== USER_SETTINGS_DEMO_VERSION) {
      const fresh = cloneSettingsState(initialSettingsState);
      localStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(withDemoVersion(fresh)));
      return fresh;
    }

    return {
      ...cloneSettingsState(initialSettingsState),
      ...parsed,
      profile: {
        ...initialSettingsState.profile,
        ...parsed.profile,
      },
      notifications: {
        ...initialSettingsState.notifications,
        ...parsed.notifications,
      },
      diet: {
        ...initialSettingsState.diet,
        ...parsed.diet,
        allergens: parsed.diet?.allergens ?? initialSettingsState.diet.allergens,
      },
      app: normalizeAppSettings({
        ...initialSettingsState.app,
        ...parsed.app,
      }),
      account: {
        ...initialSettingsState.account,
        ...parsed.account,
      },
      fasting: migrateFastingPreferences(
        parsed.fasting,
        parsed.fasting && "sredaPetak" in parsed.fasting ? FASTING_CONFIG_VERSION : 3,
      ),
      aiPreferences: {
        ...initialSettingsState.aiPreferences,
        ...parsed.aiPreferences,
        favorites: parsed.aiPreferences?.favorites ?? initialSettingsState.aiPreferences.favorites,
      },
    };
  } catch {
    return cloneSettingsState(initialSettingsState);
  }
}

export function saveUserSettings(state: SettingsState) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(withDemoVersion(state)));
}

export function getUserReligion() {
  return loadUserSettings().profile.religion;
}

export function syncRegisterDraftToSettings(draft: RegisterDraft) {
  const current = loadUserSettings();
  const next: SettingsState = {
    ...current,
    profile: {
      ...current.profile,
      firstName: draft.firstName || current.profile.firstName,
      lastName: draft.lastName || current.profile.lastName,
      email: draft.email || current.profile.email,
      cardNumber: draft.cardNumber || current.profile.cardNumber,
      faculty: draft.faculty || draft.school || current.profile.faculty,
      religion: draft.religion || current.profile.religion,
    },
    notifications: {
      ...current.notifications,
      ...(draft.religion === "hristijanstvo"
        ? {
            christianFastingMenuReminders: true,
            christianDailyPosnoAlerts: true,
          }
        : {}),
      ...(draft.religion === "islam"
        ? {
            islamRamadanMenuSignup: true,
            islamTakeawayReminder: true,
          }
        : {}),
    },
  };

  saveUserSettings(next);
  createCardFromRegistration(draft);
  return next;
}
