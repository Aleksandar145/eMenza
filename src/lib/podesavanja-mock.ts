import type { RegisterRole } from "@/lib/register-mock";
import { studentProfile } from "@/lib/dashboard-mock";
import { buildAccountInfo } from "@/lib/account-info";
import type { FavoriteEntry } from "@/lib/ai-preporuka-mock";
import {
  createEmptyFastingPreferences,
  type FastingPreferences,
} from "@/lib/fasting-preferences";
import type { UserReligion } from "@/lib/user-preferences";

export type SettingsTabId =
  | "profil"
  | "bezbednost"
  | "notifikacije"
  | "ishrana"
  | "aplikacija"
  | "nalog";

export type ProfileSettings = {
  firstName: string;
  lastName: string;
  email: string;
  cardNumber: string;
  faculty: string;
  generation: string;
  religion: UserReligion;
  /** Učenik (škola) ili student (fakultet + indeks). */
  studentKind?: RegisterRole;
};

export type NotificationSettings = {
  reservationReminder: boolean;
  canteenAnnouncements: boolean;
  lowBalanceAlert: boolean;
  promotionsAndMenu: boolean;
  reminderTime: "08:00" | "12:00" | "18:00";
  christianFastingMenuReminders: boolean;
  christianDailyPosnoAlerts: boolean;
  islamRamadanMenuSignup: boolean;
  islamTakeawayReminder: boolean;
};

export type DietRestriction = "none" | "vegetarian" | "vegan";

export type DietSettings = {
  restriction: DietRestriction;
  allergens: string[];
  note: string;
};

export type AppSettings = {
  language: "sr" | "en";
  defaultLandingPage: "dashboard" | "rezervacije";
};

export type AccountInfo = {
  accountType: string;
  registeredAt: string;
  registrationOnboardingCompleted?: boolean;
};

export type AiPreferenceSettings = {
  favorites: FavoriteEntry[];
  updatedAt?: string;
};

export type SettingsState = {
  profile: ProfileSettings;
  notifications: NotificationSettings;
  diet: DietSettings;
  app: AppSettings;
  account: AccountInfo;
  fasting: FastingPreferences;
  aiPreferences: AiPreferenceSettings;
};

export const settingsTabs: { id: SettingsTabId; label: string }[] = [
  { id: "profil", label: "Profil" },
  { id: "bezbednost", label: "Bezbednost" },
  { id: "notifikacije", label: "Notifikacije" },
  { id: "ishrana", label: "Ishrana" },
  { id: "aplikacija", label: "Aplikacija" },
  { id: "nalog", label: "Nalog" },
];

export const allergenOptions = [
  { id: "laktoza", label: "Laktoza" },
  { id: "gluten", label: "Gluten" },
  { id: "orasasti", label: "Orašasti plodovi" },
  { id: "jaja", label: "Jaja" },
  { id: "soja", label: "Soja" },
  { id: "riba", label: "Riba / morski plodovi" },
] as const;

export const dietRestrictionOptions: { id: DietRestriction; label: string }[] = [
  { id: "none", label: "Bez restrikcija" },
  { id: "vegetarian", label: "Vegetarijanac" },
  { id: "vegan", label: "Vegan" },
];

export const reminderTimeOptions = [
  { value: "08:00" as const, label: "08:00 — pre doručka" },
  { value: "12:00" as const, label: "12:00 — pre ručka" },
  { value: "18:00" as const, label: "18:00 — pre večere" },
];

export const languageOptions = [
  { value: "sr" as const, label: "Srpski" },
  { value: "en" as const, label: "English" },
];

function parseStudentName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName };
}

const { firstName, lastName } = parseStudentName(studentProfile.name);

const demoProfile: ProfileSettings = {
  firstName,
  lastName,
  email: "marija.simic@student.rs",
  cardNumber: "345678901234",
  faculty: "Fakultet organizacionih nauka",
  generation: studentProfile.subtitle.replace("Student  |  ", "").trim() || "2021/2023",
  religion: "islam",
  studentKind: "student",
};

export const initialSettingsState: SettingsState = {
  profile: demoProfile,
  notifications: {
    reservationReminder: true,
    canteenAnnouncements: true,
    lowBalanceAlert: true,
    promotionsAndMenu: false,
    reminderTime: "18:00",
    christianFastingMenuReminders: false,
    christianDailyPosnoAlerts: false,
    islamRamadanMenuSignup: true,
    islamTakeawayReminder: true,
  },
  diet: {
    restriction: "none",
    allergens: [],
    note: "",
  },
  app: {
    language: "sr",
    defaultLandingPage: "dashboard",
  },
  account: buildAccountInfo({
    studentKind: demoProfile.studentKind,
    createdAt: new Date("2024-09-15"),
  }),
  fasting: createEmptyFastingPreferences(),
  aiPreferences: {
    favorites: [],
  },
};

export function cloneSettingsState(state: SettingsState): SettingsState {
  return {
    profile: { ...state.profile },
    notifications: { ...state.notifications },
    diet: {
      ...state.diet,
      allergens: [...state.diet.allergens],
    },
    app: { ...state.app },
    account: { ...state.account },
    fasting: { ...state.fasting },
    aiPreferences: {
      ...state.aiPreferences,
      favorites: (state.aiPreferences?.favorites ?? []).map((entry) => ({ ...entry })),
    },
  };
}

/** Prazan profil za učitavanje pravog naloga — bez Marije iz demo mocka. */
export function createEmptySettingsState(): SettingsState {
  const base = cloneSettingsState(initialSettingsState);
  base.profile = {
    firstName: "",
    lastName: "",
    email: "",
    cardNumber: "",
    faculty: "",
    generation: "",
    religion: "ne_zelim",
    studentKind: "ucenik",
  };
  base.fasting = createEmptyFastingPreferences();
  base.account = buildAccountInfo({ studentKind: base.profile.studentKind });
  return base;
}
