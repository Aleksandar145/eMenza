import { eq } from "drizzle-orm";
import { buildAccountInfo, isRegistrationOnboardingPending } from "@/lib/account-info";
import { normalizeAppSettings } from "@/lib/app-preferences";
import {
  cloneSettingsState,
  createEmptySettingsState,
  type ProfileSettings,
  type SettingsState,
} from "@/lib/podesavanja-mock";
import {
  FASTING_CONFIG_VERSION,
  migrateFastingPreferences,
  normalizeFastingPreferences,
} from "@/lib/fasting-preferences";
import { parseStudentDisplayName, resolveStudentProfileKind } from "@/lib/student-profile";
import { LOCKED_PROFILE_FIELDS } from "@/lib/student-profile-constants";
import { getDb } from "@/server/db";
import { profiles, studentCards, userSettings } from "@/server/db/schema";

function hydrateProfileFromRegistry(
  profile: ProfileSettings,
  source: {
    email: string;
    displayName: string;
    faculty?: string | null;
    indexNumber?: string | null;
    cardNumber?: string | null;
  },
): ProfileSettings {
  const next = { ...profile };

  if (!next.email.trim()) {
    next.email = source.email;
  }

  if (!next.firstName.trim() || !next.lastName.trim()) {
    const parsed = parseStudentDisplayName(source.displayName);
    if (!next.firstName.trim()) {
      next.firstName = parsed.firstName;
    }
    if (!next.lastName.trim()) {
      next.lastName = parsed.lastName;
    }
  }

  if (!next.faculty.trim() && source.faculty?.trim()) {
    next.faculty = source.faculty.trim();
  }

  if (!next.generation.trim() && source.indexNumber?.trim()) {
    next.generation = source.indexNumber.trim();
  }

  if (!next.cardNumber.trim() && source.cardNumber?.trim()) {
    next.cardNumber = source.cardNumber.trim();
  }

  if (!next.studentKind) {
    next.studentKind = resolveStudentProfileKind({
      indexNumber: source.indexNumber,
      generation: next.generation,
    });
  }

  if (
    !next.generation.trim() &&
    source.indexNumber?.trim() &&
    next.studentKind === "student"
  ) {
    next.generation = source.indexNumber.trim();
  }

  return next;
}

type StoredSettingsState = SettingsState & { fastingConfigVersion?: number };

function parseStoredSettings(blob: unknown): StoredSettingsState {
  if (!blob || typeof blob !== "object") {
    return createEmptySettingsState() as StoredSettingsState;
  }

  const parsed = blob as StoredSettingsState;
  const next = cloneSettingsState(parsed) as StoredSettingsState;

  if (typeof parsed.fastingConfigVersion === "number") {
    next.fastingConfigVersion = parsed.fastingConfigVersion;
  }

  next.fasting = normalizeFastingPreferences(next.fasting);
  next.app = normalizeAppSettings(next.app);

  return next;
}

function stripInternalSettingsMeta(settings: StoredSettingsState): SettingsState {
  return cloneSettingsState(settings);
}

function mergeStoredAccountInfo(
  built: SettingsState["account"],
  stored: SettingsState["account"] | undefined,
): SettingsState["account"] {
  if (stored?.registrationOnboardingCompleted !== undefined) {
    return {
      ...built,
      registrationOnboardingCompleted: stored.registrationOnboardingCompleted,
    };
  }

  return built;
}

async function readSettingsRows(profileId: string) {
  const db = getDb();

  const [[profileRow], [settingsRow], [cardRow]] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1),
    db.select().from(userSettings).where(eq(userSettings.profileId, profileId)).limit(1),
    db
      .select({ cardNumber: studentCards.cardNumber })
      .from(studentCards)
      .where(eq(studentCards.profileId, profileId))
      .limit(1),
  ]);

  return { profileRow, settingsRow, cardRow };
}

async function writeSettingsBlob(profileId: string, settings: StoredSettingsState) {
  const db = getDb();

  await db
    .insert(userSettings)
    .values({
      profileId,
      settings,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userSettings.profileId,
      set: { settings, updatedAt: new Date() },
    });
}

function applyFastingConfigMigration(settings: StoredSettingsState): {
  next: StoredSettingsState;
  changed: boolean;
} {
  const fromVersion = settings.fastingConfigVersion ?? 0;

  if (fromVersion >= FASTING_CONFIG_VERSION) {
    return { next: settings, changed: false };
  }

  const next = parseStoredSettings(settings);
  next.fasting = migrateFastingPreferences(next.fasting, fromVersion);
  next.fastingConfigVersion = FASTING_CONFIG_VERSION;

  return { next, changed: true };
}

export async function getUserSettingsDb(profileId: string): Promise<SettingsState> {
  const { profileRow, settingsRow, cardRow } = await readSettingsRows(profileId);

  const base = settingsRow?.settings
    ? parseStoredSettings(settingsRow.settings)
    : (createEmptySettingsState() as StoredSettingsState);
  const { next: migrated, changed } = applyFastingConfigMigration(base);

  if (changed) {
    await writeSettingsBlob(profileId, migrated);
  }

  const next = stripInternalSettingsMeta(migrated);

  if (!profileRow) {
    return next;
  }

  next.profile = hydrateProfileFromRegistry(next.profile, {
    email: profileRow.email,
    displayName: profileRow.displayName,
    faculty: profileRow.faculty,
    indexNumber: profileRow.indexNumber,
    cardNumber: cardRow?.cardNumber ?? null,
  });

  next.account = mergeStoredAccountInfo(
    buildAccountInfo({
      studentKind: next.profile.studentKind,
      createdAt: profileRow.createdAt,
    }),
    migrated.account,
  );

  return next;
}

export async function isRegistrationOnboardingPendingForProfile(
  profileId: string,
): Promise<boolean> {
  const settings = await getUserSettingsDb(profileId);
  return isRegistrationOnboardingPending(settings.account);
}

function mergeLockedProfileFields(
  incoming: SettingsState,
  existing: SettingsState,
): SettingsState {
  const payload = cloneSettingsState(incoming);

  for (const field of LOCKED_PROFILE_FIELDS) {
    payload.profile[field] = existing.profile[field];
  }

  return payload;
}

export async function saveUserSettingsDb(
  profileId: string,
  settings: SettingsState,
  options?: { enforceStudentLocks?: boolean },
) {
  const { profileRow, settingsRow, cardRow } = await readSettingsRows(profileId);
  const existing = settingsRow?.settings
    ? parseStoredSettings(settingsRow.settings)
    : (createEmptySettingsState() as StoredSettingsState);

  let payload = parseStoredSettings(settings);
  payload.fastingConfigVersion = existing.fastingConfigVersion ?? FASTING_CONFIG_VERSION;

  if (options?.enforceStudentLocks) {
    payload = parseStoredSettings(mergeLockedProfileFields(payload, stripInternalSettingsMeta(existing)));
    payload.fastingConfigVersion = existing.fastingConfigVersion ?? FASTING_CONFIG_VERSION;
  }

  if (profileRow) {
    payload.profile = hydrateProfileFromRegistry(payload.profile, {
      email: profileRow.email,
      displayName: profileRow.displayName,
      faculty: profileRow.faculty,
      indexNumber: profileRow.indexNumber,
      cardNumber: cardRow?.cardNumber ?? null,
    });
    payload.account = mergeStoredAccountInfo(
      buildAccountInfo({
        studentKind: payload.profile.studentKind,
        createdAt: profileRow.createdAt,
      }),
      payload.account.registrationOnboardingCompleted !== undefined
        ? payload.account
        : stripInternalSettingsMeta(existing).account,
    );
  }

  await writeSettingsBlob(profileId, payload);
  return stripInternalSettingsMeta(payload);
}

export async function saveUserSettingsForProfile(profileId: string, settings: SettingsState) {
  const db = getDb();
  const [profile] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, profileId))
    .limit(1);

  return saveUserSettingsDb(profileId, settings, {
    enforceStudentLocks: profile?.role === "student",
  });
}
