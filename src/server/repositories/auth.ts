import { randomUUID } from "node:crypto";
import { createClerkClient } from "@clerk/backend";
import { eq } from "drizzle-orm";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { RegisterDraft } from "@/lib/register-mock";
import { resolveRegisterSchoolOrFaculty } from "@/lib/register-mock";
import { initialSettingsState, cloneSettingsState } from "@/lib/podesavanja-mock";
import { buildAccountInfo } from "@/lib/account-info";
import { getDb } from "@/server/db";
import { profiles, studentCards, userSettings } from "@/server/db/schema";
import { createCardFromRegistrationDb, findCardByEmailOrNumber } from "@/server/repositories/cards";
import {
  deleteStudentNotificationsByEmail,
  deleteStudentNotificationsByProfileId,
} from "@/server/repositories/notifications";
import type { AppRole } from "@/server/auth/session";

const DEMO_VALID_UNTIL = "2027-06-30";

function buildRegistrationProfileFields(draft: RegisterDraft) {
  const schoolOrFaculty = resolveRegisterSchoolOrFaculty(draft);

  return {
    schoolOrFaculty: schoolOrFaculty || null,
    indexNumber: draft.role === "student" ? draft.indexNumber ?? null : null,
  };
}

function applyRegisterSettingsFromDraft(settings: ReturnType<typeof cloneSettingsState>, draft: RegisterDraft) {
  const { schoolOrFaculty, indexNumber } = buildRegistrationProfileFields(draft);

  settings.profile.firstName = draft.firstName;
  settings.profile.lastName = draft.lastName;
  settings.profile.email = draft.email.trim().toLowerCase();
  settings.profile.cardNumber = draft.cardNumber.replace(/\D/g, "");
  settings.profile.faculty = schoolOrFaculty ?? "";
  settings.profile.studentKind = draft.role;
  settings.profile.generation = indexNumber ?? "";

  if (draft.religion) {
    settings.profile.religion = draft.religion;
  }

  settings.account = buildAccountInfo({
    studentKind: draft.role,
    createdAt: new Date(),
    registrationOnboardingCompleted: false,
  });

  return settings;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function resolveStudentLoginEmail(identifier: string) {
  const trimmed = identifier.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.includes("@")) {
    return normalizeEmail(trimmed);
  }

  const card = await findCardByEmailOrNumber(trimmed);
  return card?.email ? normalizeEmail(card.email) : null;
}

export const REGISTER_EMAIL_EXISTS_MESSAGE = "Student sa ovim emailom već postoji.";
export const REGISTER_CARD_EXISTS_MESSAGE = "Kartica sa ovim brojem je već registrovana.";

export async function findProfileByClerkUserId(clerkUserId: string) {
  const db = getDb();
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.clerkUserId, clerkUserId))
    .limit(1);
  return profile ?? null;
}

export async function findProfileByEmail(email: string) {
  const db = getDb();
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.email, normalizeEmail(email)))
    .limit(1);
  return profile ?? null;
}

/** Pronađi studentski profil po Clerk ID-u ili email-u; po potrebi upari clerk_user_id. */
export async function resolveClerkStudentProfile(
  clerkUserId: string,
  email: string,
  options?: { displayName?: string },
) {
  const byClerk = await findProfileByClerkUserId(clerkUserId);
  if (byClerk?.role === "student") {
    if (
      options?.displayName &&
      (!byClerk.displayName || !byClerk.displayName.trim())
    ) {
      const db = getDb();
      await db
        .update(profiles)
        .set({ displayName: options.displayName.trim(), updatedAt: new Date() })
        .where(eq(profiles.id, byClerk.id));
      return { ...byClerk, displayName: options.displayName.trim() };
    }
    return byClerk;
  }

  const byEmail = await findProfileByEmail(email);
  if (!byEmail || byEmail.role !== "student") {
    return byClerk ?? null;
  }

  if (!byEmail.clerkUserId) {
    const db = getDb();
    await db
      .update(profiles)
      .set({
        clerkUserId,
        updatedAt: new Date(),
        ...(options?.displayName && (!byEmail.displayName || !byEmail.displayName.trim())
          ? { displayName: options.displayName.trim() }
          : {}),
      })
      .where(eq(profiles.id, byEmail.id));
    return {
      ...byEmail,
      clerkUserId,
      ...(options?.displayName && (!byEmail.displayName || !byEmail.displayName.trim())
        ? { displayName: options.displayName.trim() }
        : {}),
    };
  }

  if (byEmail.clerkUserId === clerkUserId) {
    return byEmail;
  }

  return byClerk ?? null;
}

export async function assertEmailAvailableForRegistration(email: string) {
  if (await findProfileByEmail(email)) {
    throw new Error(REGISTER_EMAIL_EXISTS_MESSAGE);
  }
}

export async function assertCardNumberAvailableForRegistration(cardNumber: string) {
  const digits = cardNumber.replace(/\D/g, "");
  if (!digits) {
    return;
  }

  const db = getDb();
  const [existingCard] = await db
    .select({ id: studentCards.id })
    .from(studentCards)
    .where(eq(studentCards.cardNumber, digits))
    .limit(1);

  if (existingCard) {
    throw new Error(REGISTER_CARD_EXISTS_MESSAGE);
  }
}

export async function registerStudentAccount(
  draft: RegisterDraft,
  options?: { authUserId?: string; emailRedirectTo?: string },
) {
  if (!draft.password || draft.password.length < 6) {
    throw new Error("Lozinka mora imati najmanje 6 karaktera.");
  }

  const email = normalizeEmail(draft.email);
  await assertEmailAvailableForRegistration(email);
  await assertCardNumberAvailableForRegistration(draft.cardNumber);

  // Email registracija radi iskljucivo kroz browser (PKCE) `signUp` poziv u
  // RegisterWizard-u. To je isti flow koji password reset vec koristi i koji
  // /auth/callback (`createServerClient`, flowType: "pkce") ume da razmeni.
  // Samo takav browser signUp postavlja code_verifier u korisnikov cookie tako
  // da confirmation link moze da se razmeni u /auth/callback. Ovde zato ne
  // pozivamo signUp niti kreiramo auth user-a -- koristimo id koji je browser
  // vec dobio i samo upisujemo zapise u bazu.
  const authUserId = options?.authUserId;
  if (!authUserId) {
    throw new Error("Registracija nije uspela.");
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Backend not configured");
  }
  const { data: existingUser } = await admin.auth.admin.getUserById(authUserId);
  if (!existingUser?.user) {
    throw new Error("Registracija nije uspela.");
  }

  const db = getDb();
  const displayName = `${draft.firstName} ${draft.lastName}`.trim();
  const { schoolOrFaculty, indexNumber } = buildRegistrationProfileFields(draft);

  await db.insert(profiles).values({
    id: authUserId,
    email,
    displayName,
    role: "student",
    faculty: schoolOrFaculty,
    indexNumber,
  });

  const settings = applyRegisterSettingsFromDraft(cloneSettingsState(initialSettingsState), {
    ...draft,
    email,
  });

  await db.insert(userSettings).values({
    profileId: authUserId,
    settings,
  });

  await createCardFromRegistrationDb(authUserId, draft, DEMO_VALID_UNTIL);

  await deleteStudentNotificationsByEmail(email, authUserId);

  return { userId: authUserId };
}

export async function completeOAuthStudentRegistration(
  userId: string,
  email: string,
  draft: RegisterDraft,
  options?: { clerkUserId?: string },
) {
  const db = getDb();
  const normalizedEmail = normalizeEmail(email);

  if (options?.clerkUserId) {
    const existingByClerk = await findProfileByClerkUserId(options.clerkUserId);
    if (existingByClerk) {
      throw new Error(REGISTER_EMAIL_EXISTS_MESSAGE);
    }
  } else {
    const existingProfile = await getProfileByUserId(userId);
    if (existingProfile) {
      throw new Error(REGISTER_EMAIL_EXISTS_MESSAGE);
    }
  }

  await assertCardNumberAvailableForRegistration(draft.cardNumber);

  const displayName = `${draft.firstName} ${draft.lastName}`.trim();
  const profileId = options?.clerkUserId ? randomUUID() : userId;
  const { schoolOrFaculty, indexNumber } = buildRegistrationProfileFields(draft);

  await db.insert(profiles).values({
    id: profileId,
    clerkUserId: options?.clerkUserId ?? null,
    email: normalizedEmail,
    displayName,
    role: "student",
    faculty: schoolOrFaculty,
    indexNumber,
  });

  const settings = applyRegisterSettingsFromDraft(cloneSettingsState(initialSettingsState), {
    ...draft,
    email: normalizedEmail,
  });

  await db.insert(userSettings).values({
    profileId,
    settings,
  });

  await createCardFromRegistrationDb(profileId, draft, DEMO_VALID_UNTIL);

  await deleteStudentNotificationsByEmail(normalizedEmail, profileId);

  return { userId: profileId };
}

async function getProfileByUserId(userId: string) {
  const db = getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  return profile ?? null;
}

export async function ensureStaffProfile(
  userId: string,
  email: string,
  displayName: string,
  role: AppRole,
) {
  const db = getDb();
  await db
    .insert(profiles)
    .values({
      id: userId,
      email,
      displayName,
      role,
    })
    .onConflictDoUpdate({
      target: profiles.id,
      set: { email, displayName, role, updatedAt: new Date() },
    });
}

export async function createStaffUser(
  email: string,
  password: string,
  displayName: string,
  role: AppRole,
) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Backend not configured");
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName, role },
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? "Staff user creation failed");
  }

  await ensureStaffProfile(data.user.id, email.trim().toLowerCase(), displayName, role);
  return data.user.id;
}

export async function deleteStudentAccount(profileId: string) {
  const db = getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);

  if (!profile || profile.role !== "student") {
    throw new Error("Studentski nalog nije pronađen.");
  }

  if (profile.clerkUserId) {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      throw new Error("Clerk nije konfigurisan.");
    }

    const clerk = createClerkClient({ secretKey });
    try {
      await clerk.users.deleteUser(profile.clerkUserId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/not found|404/i.test(message)) {
        throw error;
      }
    }
  } else {
    const admin = createSupabaseAdminClient();
    if (!admin) {
      throw new Error("Backend nije konfigurisan.");
    }

    const { error } = await admin.auth.admin.deleteUser(profileId);
    if (error && !/not found|404/i.test(error.message)) {
      throw new Error(error.message);
    }
  }

  await deleteStudentNotificationsByProfileId(profileId);
  await db.delete(profiles).where(eq(profiles.id, profileId));
}
